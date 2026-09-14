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

1. New service from this repo, **root directory = `telegram-gateway/`** (Dockerfile; build/deploy defaults in `railway.toml`, platform healthcheck on `GET /healthz`).
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

### VPN-less variant (Railway Console — added 2026-09-10)

When the operator cannot run the ceremony locally (Telegram blocked in their
country, no VPN), run it **inside the deployed gateway container** via the
Railway **Console** tab. The container has free egress, `telethon` is already
installed, and `TG_API_ID`/`TG_API_HASH` are already in its env — nothing is
typed besides the phone number and the login code.

The script is **two-phase** so a dropped console (power cut) does not restart
the ceremony from zero: phase `send` persists the auth key + `phone_code_hash`
to `/tmp/ceremony.state`; phase `login` completes sign-in from a fresh console
session while the code is still valid.

```bash
# 1) paste this single line in the Console (creates /tmp/ceremony.py):
echo '<base64-of-script>' | base64 -d > /tmp/ceremony.py
# 2) send the login code:
python /tmp/ceremony.py send     # asks phone (+98...), sends code
# 3) after the code arrives in Telegram:
python /tmp/ceremony.py login    # asks code (+2FA if set), prints SESSION_STRING
# 4) paste the string into Variables → TG_SESSION_STRING → Apply → Deploy
```

Script (what the base64 payload decodes to):

```python
import asyncio, json, os, sys
from telethon import TelegramClient, errors
from telethon.sessions import StringSession

API_ID = (os.environ.get('TG_API_ID') or '').strip()
API_HASH = (os.environ.get('TG_API_HASH') or '').strip()
STATE = '/tmp/ceremony.state'

def client(session=''):
    return TelegramClient(StringSession(session), int(API_ID), API_HASH)

async def do_send():
    if not API_ID or not API_HASH:
        print('ERROR: TG_API_ID/TG_API_HASH not set in service env'); return
    print('api_id:', API_ID[:4] + '***', 'ok')
    phone = input('phone (like +989123456789): ').strip()
    c = client()
    await c.connect()
    try:
        sent = await c.send_code_request(phone)
    except errors.FloodWaitError as e:
        print('FLOOD WAIT: retry in %s seconds' % e.seconds); return
    except Exception as e:
        print('ERROR:', type(e).__name__, str(e)[:150]); return
    json.dump({'phone': phone, 'session': c.session.save(), 'hash': sent.phone_code_hash},
              open(STATE, 'w'))
    await c.disconnect()
    print('CODE SENT -> now run:  python /tmp/ceremony.py login')

async def do_login():
    try:
        st = json.load(open(STATE))
    except FileNotFoundError:
        print('no state file — run:  python /tmp/ceremony.py send'); return
    c = client(st['session'])
    await c.connect()
    code = input('login code: ').strip()
    try:
        await c.sign_in(phone=st['phone'], code=code, phone_code_hash=st['hash'])
    except errors.SessionPasswordNeededError:
        try:
            await c.sign_in(password=input('2FA password: '))
        except Exception as e:
            print('ERROR:', type(e).__name__, str(e)[:150]); return
    except errors.PhoneCodeInvalidError:
        print('WRONG CODE — rerun:  python /tmp/ceremony.py login'); return
    except errors.PhoneCodeExpiredError:
        print('CODE EXPIRED — rerun:  python /tmp/ceremony.py send'); return
    except Exception as e:
        print('ERROR:', type(e).__name__, str(e)[:150]); return
    s = c.session.save()
    await c.disconnect()
    print()
    print('SUCCESS — copy everything AFTER the colon:')
    print('SESSION_STRING:' + s)

asyncio.run(do_send() if sys.argv[1:2] == ['send'] else do_login())
```

Notes:
- A redeploy wipes `/tmp` — run both phases in the same deployment window, and
  do not push to the branch mid-ceremony.
- Repeated `send` calls too quickly hit FloodWait (wait the printed seconds).
- The session string is printed only on the owner's console screen; paste it
  straight into Railway Variables, never into chat/git.
