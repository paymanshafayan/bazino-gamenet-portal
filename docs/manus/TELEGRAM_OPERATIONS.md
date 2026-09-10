# تلگرام — راهنمای عملیات سه‌طرفه (Manus / Portal / Gateway)

سند طراحی کامل: `TELEGRAM_CAMPAIGN_PLAN.md` (بخش ۵ = زنجیره سیاست، بخش ۵٫۱ = مسیر دستی).
این سند فقط «چه کسی چه می‌کند و چطور مستقر/اداره می‌شود» را می‌گوید.

## نقش‌ها در یک نگاه

| نقش | تصمیم می‌گیرد؟ | اجرا می‌کند؟ | حرف می‌زند با |
|---|---|---|---|
| **Manus** (عامل بیرونی) | فقط محتوای کمپین را پیشنهاد می‌دهد | ❌ هیچ ارسالی | فقط Portal (`/api/manus/telegram/*`) |
| **Portal** (این ریپو) | ✅ مقصد، سیاست، تأیید، امضا | ❌ مستقیم به تلگرام وصل نمی‌شود | Gateway (`/internal/*`, Bearer+HMAC) |
| **Gateway** (`telegram-gateway/`) | ❌ هیچ تصمیمی | ✅ فقط دستور امضاشده Portal | تلگرام (Telethon) |

قانون طلایی: **Manus هرگز مستقیم به Gateway وصل نمی‌شود.** هر ارسالی یا تأیید کمپین دارد یا ارسال مستقیم مدیر است؛ هر دو از زنجیره fail-closed بخش ۵ پلن می‌گذرند.

---

## بخش ۱ — Manus (عامل بیرونی)

- **Base URL:** `https://bazino.pro` (پروداکشن) — همه مسیرها زیر `/api/manus/telegram/…`.
- **احراز هویت:** `Authorization: Bearer baz_…` — توکن integration با scope دقیق `manus:telegram` که ادمین از پنل مدیریت صادر می‌کند. بدون scope درست → `401`.
- **چرخه کمپین:**
  1. `POST /campaigns` — ساخت پیش‌نویس کمپین (متن + caps + fence + انقضا).
  2. انتظار: **مدیر کمپین را در استودیو تأیید می‌کند** (فقط متن/کمپین یک‌بار تأیید می‌شود، نه هر ارسال).
  3. `GET /dialogs?sendable_only=true` + `GET /dialogs/{id}/permissions` — کشف مقصدهای مجاز.
  4. `POST /campaign/drafts` — ثبت draft برای هر ارسال (فقط Manus؛ روی آینه مدیریتی mount نیست).
  5. Portal تصمیم می‌گیرد: `sent` خودکار (کمپین live + همه گیت‌ها سبز) یا `pending_approval` (صف مدیر).
  6. `GET /reports/affiliate/daily?date=` — گزارش روزانه (ممکن است `data_unavailable` باشد).
- **ممنوعه‌ها:** ارسال مستقیم، حدس `telegram_message_id`، صدا زدن Gateway، دور زدن `expires_at`/idempotency.

## بخش ۲ — Portal (این ریپو)

### متغیرهای محیطی

| متغیر | لازم؟ | توضیح |
|---|---|---|
| `TG_GATEWAY_URL` | ✅ | آدرس Gateway؛ در Railway ترجیحاً دامنه private (مثل `http://tg-gateway.railway.internal`) |
| `TG_GATEWAY_BEARER` | ✅ | عین `GATEWAY_BEARER` روی سرویس Gateway |
| `TG_GATEWAY_HMAC_SECRET` | ✅ | عین `GATEWAY_HMAC_SECRET` روی سرویس Gateway |

بدون این سه‌تا، مسیرهای تلگرام و تب استودیو fail-closed از کار می‌افتند (ارسالی انجام نمی‌شود).

### Endpointها

| مسیر | مصرف‌کننده | احراز |
|---|---|---|
| `/api/manus/telegram/health` + `dialogs…` + `search…` + `reports…` | Manus | `baz_` + scope |
| `/api/manus/telegram/campaigns…` + `campaign/drafts` (POST) + `send-direct` | Manus | `baz_` + scope |
| `/api/manus/telegram/admin/*` (kill-switch، تنظیمات) | ادمین | JWT ادمین |
| `/api/management/telegram/*` (آینه کامل به‌جز POST drafts + دو فهرست drafts/decisions) | تب استودیو | JWT ادمین |

### استقرار و تست

- بخشی از سرویس اصلی Portal است؛ چیز جدایی برای deploy ندارد — فقط سه env بالا.
- تست‌ها: `npx tsx tests/manus.test.mts` (قراردادها با Gateway mock) + `npx tsx tests/ui.test.mts` (تب استودیو)؛ `tsc --noEmit` در ریشه و `Management App/Bazino`.

## بخش ۳ — Gateway (`telegram-gateway/`)

سرویس مستقل FastAPI + Telethon. جزئیات API و ceremony سشن در `telegram-gateway/README.md`.

### استقرار روی Railway (یک‌بار)

1. سرویس جدید از همین ریپو با **Root Directory = `telegram-gateway/`** (بیلد Dockerfile، کانفیگ `railway.toml`).
2. Volume به مسیر **`/data`** وصل کنید (sqlite idempotency/rate-limit/flood روی آن زندگی می‌کند).
3. Envها را از بخش «تلگرام: Gateway» در `.env.example` ریشه ست کنید (جدول زیر).
4. سشن Telethon را با ceremony داخل README گیت‌وی بسازید و در `TG_SESSION_STRING` بگذارید.
5. هلث‌چک پلتفرم روی `GET /healthz` (بدون احراز، عمداً حداقلی) سبز می‌شود؛ بعد `TG_GATEWAY_URL` پورتال را به دامنه این سرویس بدهید.

### متغیرهای محیطی Gateway

| متغیر | لازم؟ | پیش‌فرض | توضیح |
|---|---|---|---|
| `GATEWAY_BEARER` | ✅ | — | توکن Bearer؛ عین `TG_GATEWAY_BEARER` پورتال (۳۲+ کاراکتر تصادفی) |
| `GATEWAY_HMAC_SECRET` | ✅ | — | کلید HMAC؛ عین `TG_GATEWAY_HMAC_SECRET` پورتال |
| `TG_API_ID` / `TG_API_HASH` | ✅ (پروداکشن) | — | اپ تلگرام (my.telegram.org) |
| `TG_SESSION_STRING` | ✅ (پروداکشن) | — | سشن StringSession مالک (ceremony در README گیت‌وی) |
| `TG_USE_FAKE` | dev/تست | `false` | `true` = بدون تلگرام واقعی؛ **در پروداکشن ممنوع** |
| `SEND_MIN_INTERVAL_SECONDS` | — | `60` | حداقل فاصله دو ارسال |
| `SEND_MAX_PER_HOUR` | — | `30` | سقف ارسال ساعتی |
| `DB_PATH` | — | `/data/tg-gateway.sqlite` | مسیر sqlite روی volume |

---

## ران‌بوک‌ها

### تأیید کمپین (مسیر عادی)

1. Manus کمپین `draft` می‌سازد و draftها را ثبت می‌کند.
2. مدیر در استودیو → تب **تلگرام** → جدول کمپین‌ها: متن/caps/fence را می‌خواند، در صورت نیاز **ویرایش** می‌کند، بعد **تأیید** می‌کند (→ `live`).
3. از این لحظه ارسال‌های آن کمپین (با گذر از ۹ گیت بخش ۵) خودکار انجام می‌شوند؛ موارد مشکوک در **صف بررسی** می‌مانند تا مدیر resolve کند (تأیید/رد).
4. **توقف اضطراری:** سوییچ kill-switch بالای تب → همه ارسال‌ها فوراً متوقف می‌شوند؛ برای توقف دائمی یک کمپین از **revoke** استفاده کنید.

### چرخش secretها

1. مقادیر جدید `GATEWAY_BEARER`/`GATEWAY_HMAC_SECRET` را بسازید.
2. اول روی سرویس Gateway ست و redeploy کنید، بعد عین همان را روی Portal (`TG_GATEWAY_*`) ست و redeploy کنید. بین دو استقرار، ارسال‌ها با `UNAUTHORIZED` داخلی fail می‌شوند (ارسال نیمه‌کاره رخ نمی‌دهد چون idempotency روی Gateway است).

### ساخت/تعویض سشن تلگرام

طبق ceremony در `telegram-gateway/README.md` (نیازمند دسترسی مالک به شماره/اپ تلگرام). بعد از ست `TG_SESSION_STRING` جدید، سرویس را redeploy کنید و `/internal/health` را با Bearer چک کنید (`session_configured: true`).

---

## نقشه فایل‌ها

| فایل/پوشه | batch | نقش |
|---|---|---|
| `server/manus/routes.ts` (+ `policy.ts`, `store.ts`, `gateway.ts` کنارش) | B1/B3 | endpointهای Manus + آینه مدیریتی + موتور سیاست + امضای HMAC |
| `tests/manus.test.mts` | B1 | تست قراردادها با Gateway mock |
| `telegram-gateway/` (`src/`, `tests/`, `Dockerfile`, `railway.toml`, `README.md`) | B2/B4 | سرویس اجراکننده + تست پایتون + کانفیگ استقرار |
| `shared/publishing/Telegram.tsx` + تب در `Studio.tsx` + کلید `telegram` در `ui.tsx` | B3 | تب تلگرام استودیو (فقط ادمین، چهارزبانه) |
| `tests/ui.test.mts` (سوئیت ۳۵) | B3 | ۵ تست jsdom تب تلگرام |
| `docs/manus/TELEGRAM_CAMPAIGN_PLAN.md` | پلن | طراحی کامل و قراردادها |
| `docs/manus/TELEGRAM_OPERATIONS.md` (همین فایل) | B4 | راهنمای سه‌طرفه + ران‌بوک‌ها |
| `.env.example` (بخش تلگرام) | B4 | همه envهای پورتال و Gateway |
