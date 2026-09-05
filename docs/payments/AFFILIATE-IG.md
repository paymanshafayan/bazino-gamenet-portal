# کمپین اینستاگرام بازینو — Invite Your Squad (Media-ID + Friend Gate)

> پورتال به Meta وصل نیست. ناشر فقط Media ID می‌فرستد. مغز تصمیم و کد یکتا در پورتال است؛ Zernio فقط دست (PR/DM) است.

## محدوده

| هست | نیست |
|---|---|
| ثبت `media_id` پست/ریل منتشرشده | Graph API / توکن متا / Insights |
| یک Private Reply (پیام ۱ + دکمه فالو) | دو PR روی یک `comment_id` |
| دایرکت پیام ۲ با `{{code}}` بعد از دکمه | اتوماسیون ثابت Zernio با یک متن برای همه |
| کامنت همان عدد توسط دوست = `share_confirmed_by_friend_code` | لیست فالوور / scraping / تأیید Share از Meta |
| لینک `/?ref=…&utm_source=instagram&utm_medium=affiliate&utm_campaign=SQUAD26` | کمیسیون Follow / کامنت / Share |
| کوپن یک‌بارمصرف فقط اگر `ig_friend_coupon_value>0` | SMTP / درگاه آنلاین جدید |
| کمیسیون فقط قیف رزرو/پرداخت/حضور موجود | |

## فاز ۱ — ingest

`POST /api/integrations/instagram/published-media`

- `Authorization: Bearer` = `IG_INGEST_TOKEN` یا ردیف `ig_ingest_token` (seed تصادفی؛ کلید sync دوباره استفاده نمی‌شود)
- `Idempotency-Key: instagram:<media_id>`
- بدنه: `media_id`, `media_type` ∈ {`post`,`reel`}, `published_at` RFC3339 (اختیاری)، `campaign_id` / `caption_version` اختیاری
- `campaign_id` خالی مجاز است؛ ناشناخته در برابر `ig_campaign_ids` → `422 campaign_not_found`
- تکرار همان `media_id`+نوع → `200` با `duplicate: true`؛ نوع متفاوت → `409 conflicting_media`
- بدون توکن → `401`؛ نوع نامعتبر → `400`

جدول: `ig_media`.

## فاز ۲ — Friend Gate

1. کامنت کلیدواژه (`ig_campaign_keyword`، پیش‌فرض `SQUAD`) روی media ثبت‌شده → شریک + کد ۶رقمی یکتا + ردیف `affiliates` با `type=instagram` → **یک** Private Reply (پیام ۱ + دکمه).
2. دکمه → **DM** پیام ۲ با `{{code}}` (نه PR دوم). شاهد فالو اگر Zernio بگوید `follow_verified`، وگرنه `button_event_only`.
3. دوست همان عدد را زیر **همان پست** کامنت می‌کند → `share_confirmed_by_friend_code` + PR پیام دوست + دکمه.
4. دکمهٔ دوست → DM لینک دعوت (+ کوپن اگر مقدار>۰).

شبیه‌ساز ادمین (بدون Zernio):  
`POST /api/admin/ig/register-media`  
`POST /api/admin/ig/simulate-comment`  
`POST /api/admin/ig/simulate-button`

وب‌هوک عامل: `POST /api/integrations/zernio/webhook` با HMAC `X-Zernio-Signature` (SHA-256 hex روی raw body). بدون secret در production → `401`.

Outbound (فقط اگر `ZERNIO_API_KEY` و `ZERNIO_IG_ACCOUNT_ID` باشند): `https://zernio.com/api` (قابل‌override با `ZERNIO_BASE_URL`). مسیرهای PR/DM آداپترند و بدون تغییر ماشین حالت قابل تنظیم‌اند.

## متن‌ها

چهار زبان (`tr/fa/en/ru`) × پیام شریک ۱، پیام شریک ۲ (DM)، پیام دوست، پیام لینک، برچسب دکمه.  
متغیرها: `{{code}}` `{{follow_button}}` `{{invite_url}}` `{{coupon_line}}` `{{handle}}`.  
همه ردیف واقعی `settings` هستند و در `/admin/affiliates` با `data-ig-setting` ویرایش می‌شوند. کلیدها جدا از `AFFILIATE_SETTING_KEYS`اند تا فرم کمیسیون نشکند.

## جداول

`ig_media` · `ig_members` · `ig_events` — هر سه پروایدر (SQLite / `dbo.` / Mongo `col('…')`).
