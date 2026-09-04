# SMS providers (OTP login)

Bazino sends one-time login codes through `server/sms/index.ts`. The driver is chosen with environment variables:

| Variable | Values | Notes |
|---|---|---|
| `SMS_PROVIDER` | `smsto` (recommended), `easysendsms`, `mock` (default) | `mock` only logs to console; never use in production |
| `SMSTO_API_KEY` | API key from SMS.to dashboard | required for `smsto` |
| `EASYSENDSMS_API_KEY` | API key from EasySendSMS | required for `easysendsms` |
| `SMS_SENDER_ID` | alphanumeric ≤ 11 chars, default `Bazino` | sender name must be approved by the provider for some countries (TR requires registration) |

## SMS.to (primary)
1. Sign up at https://sms.to → Dashboard → **API Keys** → create key.
2. Optional: register the sender ID `Bazino` under **Sender IDs**.
3. Set `SMS_PROVIDER=smsto`, `SMSTO_API_KEY=…`, `SMS_SENDER_ID=Bazino` on Railway.
4. API used: `POST https://api.sms.to/sms/send` with `Authorization: Bearer <key>` and JSON `{message, to, sender_id, bypass_optout}`. Delivery status can be checked in the dashboard or `GET https://api.sms.to/v2/messages`.

## EasySendSMS (fallback)
`POST https://restapi.easysendsms.app/v1/rest/sms/send`, header `apikey`, JSON `{from,to,text,type}`; numbers are sent without `+`.

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
