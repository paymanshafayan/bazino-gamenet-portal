"""Telegram Gateway HTTP API (FastAPI). Executor only — never decides.

Security order per request: Bearer → HMAC (send) → expiry → idempotency replay
→ FloodWait window → rate limit → adapter call. All failures are fail-closed.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import FastAPI, Header, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .config import GatewayConfig, load_config
from .errors import is_autostop, map_exception
from .fake_adapter import FakeAdapter
from .security import is_expired, valid_bearer, verify_signature
from .store import GatewayStore

SIGNATURE_HEADER = 'x-portal-signature'


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


class SendCommand(BaseModel):
    request_id: str = Field(min_length=1, max_length=120)
    draft_id: str = Field(min_length=1, max_length=80)
    dialog_id: str = Field(min_length=1, max_length=64)
    message: str = Field(min_length=1, max_length=4096)
    idempotency_key: str = Field(min_length=1, max_length=160)
    expires_at: str = Field(min_length=1, max_length=32)


def _err(status: int, error_code: str, message: str = '') -> JSONResponse:
    return JSONResponse(status_code=status, content={
        'error': error_code, 'code': error_code, 'message': message or error_code})


def create_app(cfg: GatewayConfig | None = None, adapter: Any = None,
               store: GatewayStore | None = None) -> FastAPI:
    cfg = cfg or load_config()
    store = store or GatewayStore(cfg.db_path)
    if adapter is None:
        if cfg.use_fake:
            adapter = FakeAdapter()
        elif cfg.session_configured:
            from .adapter import TelethonAdapter  # lazy: needs `telethon` installed

            adapter = TelethonAdapter(cfg.api_id, cfg.api_hash, cfg.session_string)
        else:
            adapter = None

    app = FastAPI(title='Bazino Telegram Gateway')

    def _bearer_ok(authorization: str) -> bool:
        token = ''
        if authorization and authorization.startswith('Bearer '):
            token = authorization[7:].strip()
        return valid_bearer(token, cfg.bearer)

    @app.on_event('startup')
    async def _startup() -> None:
        if adapter is not None:
            await adapter.connect()

    @app.get('/internal/health')
    async def health(authorization: str = Header(default='')):
        if not _bearer_ok(authorization):
            return _err(401, 'UNAUTHORIZED')
        return {'ok': True, 'service': 'tg-gateway',
                'session_configured': cfg.session_configured or cfg.use_fake,
                'fake_mode': cfg.use_fake, 'timestamp': _now()}

    def _need_adapter():
        if adapter is None:
            return _err(503, 'SESSION_NOT_CONFIGURED',
                        'Telegram session not configured (owner ceremony required)')
        return None

    @app.get('/internal/dialogs')
    async def dialogs(authorization: str = Header(default='')):
        if not _bearer_ok(authorization):
            return _err(401, 'UNAUTHORIZED')
        missing = _need_adapter()
        if missing is not None:
            return missing
        try:
            return {'items': await adapter.dialogs()}
        except Exception as exc:  # noqa: BLE001 — mapped honestly below
            m = map_exception(exc)
            return _err(502, m.error_code)

    @app.get('/internal/dialogs/{dialog_id}/permissions')
    async def permissions(dialog_id: str, authorization: str = Header(default='')):
        if not _bearer_ok(authorization):
            return _err(401, 'UNAUTHORIZED')
        missing = _need_adapter()
        if missing is not None:
            return missing
        try:
            return await adapter.permissions(dialog_id)
        except Exception as exc:  # noqa: BLE001
            m = map_exception(exc)
            return _err(502, m.error_code)

    @app.get('/internal/dialogs/{dialog_id}/messages/search')
    async def search(dialog_id: str, request: Request, authorization: str = Header(default='')):
        if not _bearer_ok(authorization):
            return _err(401, 'UNAUTHORIZED')
        missing = _need_adapter()
        if missing is not None:
            return missing
        q = request.query_params
        try:
            items = await adapter.search(
                dialog_id,
                keywords=str(q.get('keywords', ''))[:300],
                lookback_hours=int(q.get('lookback_hours', 72) or 72),
                limit=int(q.get('limit', 20) or 20),
            )
            return {'dialog_id': dialog_id, 'items': items}
        except Exception as exc:  # noqa: BLE001
            m = map_exception(exc)
            return _err(502, m.error_code)

    @app.post('/internal/send')
    async def send(request: Request, authorization: str = Header(default='')):
        if not _bearer_ok(authorization):
            return _err(401, 'UNAUTHORIZED')
        raw = await request.body()
        sig = request.headers.get(SIGNATURE_HEADER, '')
        if not verify_signature(raw, sig, cfg.hmac_secret):
            return _err(401, 'INVALID_SIGNATURE')
        try:
            cmd = SendCommand.model_validate_json(raw)
        except Exception:
            return _err(422, 'INVALID_COMMAND')
        if is_expired(cmd.expires_at):
            return _err(422, 'EXPIRED_COMMAND')
        replayed = store.idem_get(cmd.idempotency_key)
        if replayed is not None:
            return {**replayed, 'replayed': True}
        missing = _need_adapter()
        if missing is not None:
            return missing
        if store.flood_active():
            result = {'request_id': cmd.request_id, 'draft_id': cmd.draft_id, 'status': 'failed',
                      'error_code': 'FLOOD_WAIT', 'retryable': False,
                      'wait_until': store.flood_blocked_until()}
            store.idem_put(cmd.idempotency_key, cmd.request_id, result)
            return result
        ok, reason = store.check_rate_limit(cmd.dialog_id, cfg.send_min_interval_seconds,
                                            cfg.send_max_per_hour)
        if not ok:
            result = {'request_id': cmd.request_id, 'draft_id': cmd.draft_id, 'status': 'failed',
                      'error_code': 'RATE_LIMITED', 'retryable': True, 'reason': reason}
            store.idem_put(cmd.idempotency_key, cmd.request_id, result)
            return result
        try:
            sent = await adapter.send(cmd.dialog_id, cmd.message)
        except Exception as exc:  # noqa: BLE001
            m = map_exception(exc)
            if m.error_code == 'FLOOD_WAIT' and m.wait_seconds:
                store.set_flood_wait(m.wait_seconds)
            result = {'request_id': cmd.request_id, 'draft_id': cmd.draft_id, 'status': 'failed',
                      'error_code': m.error_code, 'retryable': m.retryable}
            if m.wait_seconds:
                result['wait_seconds'] = m.wait_seconds
            result['autostop'] = is_autostop(m.error_code)
            store.idem_put(cmd.idempotency_key, cmd.request_id, result)
            return result
        store.record_send(cmd.dialog_id)
        result = {'request_id': cmd.request_id, 'draft_id': cmd.draft_id, 'status': 'sent',
                  'telegram_message_id': sent['telegram_message_id'], 'sent_at': sent['sent_at']}
        store.idem_put(cmd.idempotency_key, cmd.request_id, result)
        return result

    return app


# Uvicorn entrypoint: uvicorn src.app:app
app = create_app()
