# SMS providers (OTP login)

Bazino sends one-time login codes through `server/sms/index.ts`. The driver is chosen with environment variables:

| Variable | Values | Notes |
|---|---|---|
| `SMS_PROVIDER` | `smsto`, `easysendsms`, `messaggio`, `mock` (default) | `mock` only logs to console; never use in production |
| `SMSTO_API_KEY` | API key from SMS.to dashboard | required for `smsto` |
| `EASYSENDSMS_API_KEY` | API key from EasySendSMS | required for `easysendsms` |
| `MESSAGGIO_PROJECT_LOGIN` | Messaggio **Bulk Login** token (header `Messaggio-Login`) | required for `messaggio` — secret |
| `MESSAGGIO_SENDE_CODE` | Messaggio per-sender **API code** (sent as `sms.from`) | required for `messaggio` |
| `SMS_SENDER_ID` | alphanumeric ≤ 11 chars, default `Bazino` | used by smsto / easysendsms only |

## SMS.to (primary)
1. Sign up at https://sms.to → Dashboard → **API Keys** → create key.
2. Optional: register the sender ID `Bazino` under **Sender IDs**.
3. Set `SMS_PROVIDER=smsto`, `SMSTO_API_KEY=…`, `SMS_SENDER_ID=Bazino` on Railway.
4. API used: `POST https://api.sms.to/sms/send` with `Authorization: Bearer <key>` and JSON `{message, to, sender_id, bypass_optout}`. Delivery status can be checked in the dashboard or `GET https://api.sms.to/v2/messages`.

## EasySendSMS (fallback)
`POST https://restapi.easysendsms.app/v1/rest/sms/send`, header `apikey`, JSON `{from,to,text,type}`; numbers are sent without `+`.

## Messaggio
Multichannel gateway — for OTP we use the SMS channel only.
1. Register at https://my.messaggio.com/, **create an SMS sender name** and wait for activation.
2. From the sender's detail page copy the **Messaggio Bulk Login** (account auth token) and the sender's **API code**.
3. Set `SMS_PROVIDER=messaggio`, `MESSAGGIO_PROJECT_LOGIN=<bulk login>`, `MESSAGGIO_SENDE_CODE=<sender api code>`.
4. Request: `POST https://msg.messaggio.com/api/v1/send`, header `Messaggio-Login: <bulk login>`, body:
   `{"recipients":[{"phone":"90532…"}],"channels":["sms"],"sms":{"from":"<sender api code>","content":[{"type":"text","text":"…"}]}}`.
   The phone is sent as digits with country code (leading `+`/spaces are stripped). Optional delivery reports go through
   `options.dlr_callback_url` (configured in the Messaggio project settings as a Callback URL).
   Note: the Messaggio bulk login is the only true secret; the sender API code identifies the approved sender.

## Mock (development / tests)
* Codes are printed to server console as `[sms:mock] → +90…: …`.
* `GET /api/auth/otp/dev-peek?phone=+90…` returns the last code — **only** when `SMS_PROVIDER=mock` and `NODE_ENV !== 'production'`.

## OTP rules (server-side, `POST /api/auth/otp/request`)
* Phone normalised to E.164 (default country +90; `0532…` → `+90532…`; `+98`, `+357`, `+7` accepted as-is).
* Code: 6 digits, random (crypto), stored as salted SHA-256 in table `otp_codes`, valid 5 minutes, max 5 wrong attempts.
* Rate limits (phone **and** IP, both evaluated):
  * same phone: at least 60 s between requests, max 5 per hour
  * same IP (`X-Forwarded-For`, `trust proxy` enabled): max 10 per 10 minutes, max 30 per hour
  * response `429 { error, retryAfter }` — the front-end only displays a countdown using `retryAfter`.

Real sending through SMS.to / EasySendSMS has **not** been tested in this sandbox (no outbound credentials).
