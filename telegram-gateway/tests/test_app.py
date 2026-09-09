"""HTTP API tests — FastAPI TestClient + FakeAdapter + :memory: store.

No Telegram, no network, no session: proves auth order, idempotency replay,
FloodWait handling, rate limits and the fail-closed defaults.
"""
import json
import os
import unittest

# Must precede the src.app import: module level builds the uvicorn app from env.
os.environ.setdefault('DB_PATH', ':memory:')
os.environ.setdefault('GATEWAY_BEARER', 'test-bearer')
os.environ.setdefault('GATEWAY_HMAC_SECRET', 'test-hmac-secret')

from fastapi.testclient import TestClient

from src.app import SIGNATURE_HEADER, create_app
from src.config import load_config
from src.fake_adapter import FakeAdapter, FloodWaitError
from src.security import sign_command
from src.store import GatewayStore

BEARER = 'test-bearer'
HMAC = 'test-hmac-secret'


def make_client(**env_over):
    env = {'GATEWAY_BEARER': BEARER, 'GATEWAY_HMAC_SECRET': HMAC,
           'DB_PATH': ':memory:', 'TG_USE_FAKE': 'true'}
    env.update(env_over)
    cfg = load_config(env)
    adapter = FakeAdapter()
    app = create_app(cfg, adapter=adapter, store=GatewayStore(':memory:'))
    return TestClient(app), adapter


def signed(body: dict):
    raw = json.dumps(body, separators=(',', ':')).encode('utf-8')
    return raw, {'Authorization': f'Bearer {BEARER}',
                 SIGNATURE_HEADER: 'sha256=' + sign_command(HMAC, raw),
                 'Content-Type': 'application/json'}


def send_body(**over):
    b = {'request_id': 'r-1', 'draft_id': 'd-1', 'dialog_id': '-100111',
         'message': 'hello gamers', 'idempotency_key': 'k-1',
         'expires_at': '2030-01-01T00:00:00Z'}
    b.update(over)
    return b


class AppTests(unittest.TestCase):
    def test_health_ok_and_bearer_required(self):
        client, _ = make_client()
        r = client.get('/internal/health', headers={'Authorization': f'Bearer {BEARER}'})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body['service'], 'tg-gateway')
        # Exact public keys only: flags are fine, secret VALUES must never appear.
        self.assertEqual(sorted(body.keys()),
                         ['fake_mode', 'ok', 'service', 'session_configured', 'timestamp'])
        blob = json.dumps(body)
        self.assertNotIn(BEARER, blob)
        self.assertNotIn(HMAC, blob)
        r = client.get('/internal/health')
        self.assertEqual(r.status_code, 401)

    def test_healthz_public_probe_is_minimal(self):
        client, _ = make_client()
        r = client.get('/healthz')  # no auth: platform healthcheck probe
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(sorted(body.keys()), ['ok', 'service', 'timestamp'])
        self.assertTrue(body['ok'])
        self.assertEqual(body['service'], 'tg-gateway')

    def test_dialogs_permissions_search_shapes(self):
        client, _ = make_client()
        h = {'Authorization': f'Bearer {BEARER}'}
        items = client.get('/internal/dialogs', headers=h).json()['items']
        self.assertTrue(all('dialog_id' in d and 'can_send' in d for d in items))
        p = client.get('/internal/dialogs/-100111/permissions', headers=h).json()
        self.assertTrue(p['is_member'] and p['can_send'])
        p = client.get('/internal/dialogs/-1999/permissions', headers=h).json()
        self.assertFalse(p['can_send'])
        s = client.get('/internal/dialogs/-100111/messages/search?keywords=PS5',
                       headers=h).json()
        self.assertEqual(s['dialog_id'], '-100111')
        self.assertTrue(all(set(m) <= {'message_id', 'date', 'keyword', 'text'}
                            for m in s['items']))

    def test_send_happy_path_and_replay(self):
        client, adapter = make_client()
        raw, headers = signed(send_body())
        r = client.post('/internal/send', content=raw, headers=headers)
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body['status'], 'sent')
        self.assertTrue(body['telegram_message_id'])
        self.assertEqual(len(adapter.sends), 1)
        # Replay with the same idempotency key returns the stored result, no second send.
        r2 = client.post('/internal/send', content=raw, headers=headers)
        self.assertEqual(r2.json()['status'], 'sent')
        self.assertTrue(r2.json().get('replayed'))
        self.assertEqual(len(adapter.sends), 1)

    def test_send_rejects_bad_auth_signature_expiry(self):
        client, adapter = make_client()
        raw, headers = signed(send_body())
        bad = dict(headers, Authorization='Bearer wrong')
        self.assertEqual(client.post('/internal/send', content=raw, headers=bad).status_code, 401)
        bad = dict(headers, **{SIGNATURE_HEADER: 'sha256=' + '0' * 64})
        self.assertEqual(client.post('/internal/send', content=raw, headers=bad).status_code, 401)
        raw_e, headers_e = signed(send_body(expires_at='2020-01-01T00:00:00Z',
                                            idempotency_key='k-exp'))
        r = client.post('/internal/send', content=raw_e, headers=headers_e)
        self.assertEqual(r.status_code, 422)
        self.assertEqual(len(adapter.sends), 0)

    def test_flood_wait_sets_window_and_blocks_followups(self):
        client, adapter = make_client()
        adapter.fail_with = FloodWaitError(3600)
        raw, headers = signed(send_body())
        body = client.post('/internal/send', content=raw, headers=headers).json()
        self.assertEqual(body['status'], 'failed')
        self.assertEqual(body['error_code'], 'FLOOD_WAIT')
        self.assertEqual(body['wait_seconds'], 3600)
        self.assertFalse(body['retryable'])
        self.assertTrue(body['autostop'])
        # Next send (new key) is refused WITHOUT touching the adapter.
        before = len(adapter.sends)
        raw2, headers2 = signed(send_body(request_id='r-2', idempotency_key='k-2'))
        body2 = client.post('/internal/send', content=raw2, headers=headers2).json()
        self.assertEqual(body2['error_code'], 'FLOOD_WAIT')
        self.assertEqual(len(adapter.sends), before)

    def test_rate_limit_no_aggressive_retry(self):
        client, adapter = make_client()
        raw, headers = signed(send_body())
        self.assertEqual(client.post('/internal/send', content=raw, headers=headers).json()['status'], 'sent')
        raw2, headers2 = signed(send_body(request_id='r-2', idempotency_key='k-2'))
        body2 = client.post('/internal/send', content=raw2, headers=headers2).json()
        self.assertEqual(body2['status'], 'failed')
        self.assertEqual(body2['error_code'], 'RATE_LIMITED')
        self.assertEqual(len(adapter.sends), 1)

    def test_no_session_no_fake_means_503(self):
        env = {'GATEWAY_BEARER': BEARER, 'GATEWAY_HMAC_SECRET': HMAC, 'DB_PATH': ':memory:'}
        from src.app import create_app as _create
        from src.config import load_config as _load
        app = _create(_load(env), adapter=None, store=GatewayStore(':memory:'))
        client = TestClient(app)
        raw, headers = signed(send_body())
        r = client.post('/internal/send', content=raw, headers=headers)
        self.assertEqual(r.status_code, 503)


if __name__ == '__main__':
    unittest.main()
