# Bazino Telegram Gateway (Railway service)

Executor-only MTProto service. It never decides: the **portal** picks destinations,
approves campaigns and signs every command; this service verifies and executes.

```
Portal (Express) ── Bearer + HMAC + expiry + idempotency ──▶ Gateway (this) ── Telethon ──▶ Telegram
```

## Layout

| Path | Deps | Notes |
|---|---|---|
| `src/config.py`, `security.py`, `store.py`, `errors.py` | stdlib only | unit-tested without any install |
| `src/fake_adapter.py` | stdlib only | dev/tests, requires `TG_USE_FAKE=true` |
| `src/adapter.py` | `telethon` | real MTProto, imported only when a session is configured |
| `src/app.py` | `fastapi` | HTTP API + `create_app()` factory |
| `tests/` | stdlib `unittest` (+ fastapi/httpx for `test_app.py`) | |

## API (all `/internal/*` require `Authorization: Bearer <GATEWAY_BEARER>`)

- `GET /internal/health` → `{ok, service, session_configured, fake_mode, timestamp}`
- `GET /internal/dialogs` → `{items:[...]}` (joined dialogs only)
- `GET /internal/dialogs/{id}/permissions` → membership/send rights (unknown → deny)
- `GET /internal/dialogs/{id}/messages/search?keywords=&lookback_hours=&limit=` → minimal public fields
- `POST /internal/send` → signed command; success `{status:sent, telegram_message_id, sent_at}`, failure `{status:failed, error_code, retryable, ...}`

Send verification order: Bearer → HMAC (`x-portal-signature: sha256=<hex>` over raw JSON bytes)
→ pydantic shape → `expires_at` → idempotency replay → FloodWait window → rate limit → adapter.
FloodWait sets a blocking window (`wait_seconds` honored in full); follow-ups are refused
without touching Telegram. Unknown errors map to non-retryable `GATEWAY_ERROR`.

## Local dev & tests

```bash
cd telegram-gateway
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt

# stdlib-only suites (always runnable):
python3 -m unittest tests.test_security tests.test_store tests.test_errors tests.test_config
# full suite incl. HTTP API (needs fastapi/httpx from requirements):
python3 -m unittest discover -s tests
```

## Railway deploy

1. New service from this repo, **root directory = `telegram-gateway/`** (Dockerfile).
2. Mount a volume at `/data` (sqlite: idempotency + rate-limit + flood state).
3. Set env from `.env.example` (**same** `GATEWAY_BEARER`/`GATEWAY_HMAC_SECRET` as the portal's
   `TG_GATEWAY_BEARER`/`TG_GATEWAY_HMAC_SECRET`).
4. Portal env: `TG_GATEWAY_URL=https://<gateway-internal-host>:<port>` (private networking).
5. `TG_USE_FAKE` must be `false`/unset in production.

## Session ceremony (owner, one time — B5)

The gateway login uses a Telethon **session string** for the Bazino Telegram account.
The owner runs this **locally** (never in chat/CI), then stores only the resulting
string in the Railway env `TG_SESSION_STRING`:

```bash
pip install telethon
python3 - <<'EOF'
import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession

API_ID = int(input('api_id: '))
API_HASH = input('api_hash: ').strip()

async def main():
    async with TelegramClient(StringSession(), API_ID, API_HASH) as client:
        # You will be asked for phone → login code → 2FA password (if set).
        await client.start()
        print('SESSION_STRING:' + client.session.save())

asyncio.run(main())
EOF
```

Rules: the session string is the account key — Railway env only, never git/chat/logs.
If it ever leaks: revoke sessions in Telegram (Settings → Devices) and redo the ceremony.
