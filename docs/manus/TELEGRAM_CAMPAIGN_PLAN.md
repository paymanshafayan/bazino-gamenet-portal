# پلن درگاه کمپین تلگرام (Manus → Portal → Gateway)

> وضعیت: **کد جلوتر از این سند بود — به‌روز شد ۱۴۰۵/۰۶/۱۹ (2026-09-10).**  
> B1–B4 اجرا و روی برنچ `arena/01a084c6-…` پوش شده‌اند؛ این نشست آن کار را روی `arena/01a08992-bazino-gamenet-portal` بازیابی کرد.  
> **باقی‌مانده: B5 راستی‌آزمایی زنده** (سرویس Railway Gateway + Volume `/data` + سشن Telethon + توکن `baz_` با scope `manus:telegram` + حداقل یک ارسال نظارتی).  
> متن زیر قرارداد طراحی است؛ اگر با کد تعارض داشت، **کد** (`server/manus/*` + `telegram-gateway/`) مرجع است.
>
> تصمیم‌های مالک (قطعی، 2026-09-09):
> 1. تأیید انسانی **تک‌تک ارسال‌ها لازم نیست**؛ تأیید یک‌بارِ متن/کمپین کافی است.
> 2. Manus **فقط و فقط** باید از این درگاه پورتال استفاده کند (تماس مستقیم Manus با Gateway ممنوع).
> 3. ایجنت (من) **اختیار کامل** در طراحی فیلترهای ارسال دارد — زنجیره فیلتر §۵ همان است.

## ۱. هدف و غیرهدف

- هدف: Manus بتواند گفتگوهای واقعی اکانت Bazino را ببیند، مقصد مرتبط انتخاب کند، پیش‌نویس بدهد؛ پورتال در حصار تأییدشده به‌صورت خودکار ارسال کند؛ همه‌چیز audit شود.
- غیرهدف: بازنویسی کد موجود؛ بک‌اند موازی FastAPI (پرامپت Manus فرض پایتون/فست‌API داشت — **سمت پورتال فقط Express**، §۲)؛ ارسال DM انبوه؛ هر رفتار مستقلی در Gateway.

## ۲. معماری تطبیق‌یافته (قطعی)

```
Manus
  ↕ HTTPS + Bearer (baz_…)            فقط این مسیر؛ تماس مستقیم Manus با Gateway ممنوع
Bazino Portal API (Express/Node — بدون FastAPI)
  ↕ HTTPS + Bearer + HMAC + expiry + idempotency        (شبکه داخلی Railway)
Telegram Gateway (Python + Telethon — سرویس جدید جدا)
  ↕ MTProto (Telethon)
Telegram User Account (Bazino)
```

- نقش‌ها عین پرامپت Manus: Manus تصمیم‌گیر کمپین، پورتال مرکز کنترل، Gateway فقط مجری.
- کد Gateway داخل همین ریپو (`telegram-gateway/`) ولی دیپلوی جدا روی Railway.
- حالت پیش‌فرض کل سیستم: **readonly و بدون ارسال واقعی** تا تکمیل §۱۱.

## ۳. مدل تأیید: یک‌بارِ کمپین (جایگزین تأیید هر ارسال)

هر **Campaign** یک بسته تأیید یک‌بارمصرفِ انسانی است:

| فیلد | توضیح |
|---|---|
| `text` + `text_hash` (sha256) | متن دقیق؛ هر تغییری → کمپین/تأیید جدید |
| `cta_url`, `affiliate_code`, `affiliate_url`, `disclosure`, `language` | ثابت و hash-lock |
| `fence` | حصار مقصد (§۵) — فقط داخل حصار ارسال خودکار مجاز است |
| `caps` | سقف روزانه (پیش‌فرض ≤۲ مقصد/روز)، حداقل فاصله بین ارسال‌ها، ساعت سکوت |
| `expires_at` | انقضای تأیید (پیش‌فرض ۳۰ روز) |
| `status` | در کد: `draft → live` (پس از approve) سپس `paused` / `revoked`؛ ویرایش live دوباره `draft` می‌شود |

- **Draft** (به‌ازای هر ارسال پیشنهادی Manus) کماکان ساخته می‌شود، ولی به‌جای انتظار تأیید دستی، موتور سیاست پورتال آن را ارزیابی می‌کند: داخل حصار → `auto_approved` (با decision log)؛ خارج حصار → `pending_approval` برای بررسی انسانی.
- **Approve کمپین فقط با JWT ادمین** (`requireAdmin` در `server.ts:828` یا `core.guard`) — توکن Manus به‌هیچ‌وجه حق approve ندارد (تضمین در کد + تست).
- هر ارسال: لاگ کامل decision + گزارش روزانه برای نظارت پسینی (نه تأیید پیشینی).

## ۴. قرارداد endpointها

### ۴٫۱ پورتال (Express — همه جدید، هیچ‌کدام از قبل نیست)

| متد/مسیر | احراز | توضیح |
|---|---|---|
| `GET /api/manus/health` | بدون احراز | `{ok, service:"bazino-portal", telegram_gateway:"reachable\|unreachable", timestamp}` — بدون هیچ داده حساس |
| `GET /api/manus/telegram/dialogs?type=&member_only=&sendable_only=&language=` | Bearer `baz_` | فقط dialogهای واقعی عضو/دسترس؛ بدون PII |
| `GET /api/manus/telegram/dialogs/{id}/permissions` | Bearer | عضویت/ادمین/ارسال؛ نامشخص → `can_send:false` + رد مقصد |
| `GET /api/manus/telegram/dialogs/{id}/messages/search?keywords=&lookback_hours=&limit=` | Bearer | حداقل داده عمومی؛ بدون پروفایل/تلفن/ایمیل |
| `POST /api/manus/campaign/drafts` | Bearer | پیش‌نویس Manus (مطابق payload پرامپت + `campaign_id`) |
| `GET /api/manus/campaign/drafts/{id}` | Bearer | وضعیت + مقصد + متن + زمان‌ها + message_id + خطای غیرحساس |
| `POST /api/manus/campaigns` | **ادمین** | ساخت کمپین (پیش‌نویس تأیید) |
| `POST /api/manus/campaigns/{id}/approve` | **ادمین** | تأیید یک‌بار کمپین (actor + timestamp + hash در audit) |
| `POST /api/manus/campaigns/{id}/pause\|revoke` | **ادمین** | توقف/ابطال |
| `POST /api/manus/telegram/send-direct` | **ادمین** | ارسال مستقیم مدیر (dialog از فهرست واقعی + متن)؛ مستقل از کمپین ولی با چک‌های §۵٫۱ |
| `POST /api/manus/campaign/drafts/{id}/resolve` | **ادمین** | تعیین‌تکلیف draft معلق (approve یک‌باره/override + ارسال، یا reject) |
| `GET/POST /api/manus/admin/kill-switch` | **ادمین** | خواندن/تنظیم سوییچ توقف اضطراری سراسری |
| `GET /api/manus/reports/affiliate/daily?date=` | Bearer | روی `AffiliateService.report` موجود؛ بدون داده → `data_unavailable`؛ هیچ عدد ساختگی؛ بدون PII |

### ۴٫۲ Gateway (روی سرویس Gateway، فقط پورتال صدا می‌زند)

| متد/مسیر | احراز | توضیح |
|---|---|---|
| `GET /internal/dialogs`, `/internal/dialogs/{id}/permissions`, `/internal/dialogs/{id}/messages/search` | Bearer داخلی | خام Telethon؛ پورتال نسخه curated را به Manus می‌دهد |
| `POST /internal/send` | Bearer + HMAC + expiry + idempotency | اجرای send معتبر؛ پاسخ `sent|failed` با `telegram_message_id` یا `error_code+retryable` |

> شفاف‌سازی انحراف از پرامپت: `POST /api/railway/telegram/send` پرامپت روی **Gateway** پیاده می‌شود (پورتال امضا و ارسال می‌کند)، نه روی پورتال.

> آینه مدیریتی (B3): همه روت‌های بالا به‌جز `POST drafts` (فقط Manus) روی **`/api/management/telegram/*` هم mount می‌شوند** تا تب استودیو با همان `api()` مدیریتی کار کند؛ خواندنی‌ها Manus-یا-ادمین، نوشتنی‌ها فقط ادمین. دو endpoint اضافه برای UI: `GET /campaign/drafts?status=&campaign_id=&limit=` و `GET /campaign/decisions?draft_id=&limit=` (فقط ادمین).

## ۵. زنجیره فیلتر ارسال (اختیار کامل ایجنت — به ترتیب، fail-closed)

هر draft پیش از تولید دستور ارسال از این زنجیره می‌گذرد؛ **اولین مردودی = رد/صف** با `reason_code` در لاگ:

1. `CAMPAIGN_LIVE` — کمپین `live`، منقضی‌نشده، pause/revoke نشده؛ kill-switch سراسری خاموش.
2. `TEXT_HASH_MATCH` — sha256 متن draft دقیقاً برابر `text_hash` تأییدشده؛ مغایرت → `pending_approval` (نه ارسال).
3. `DEST_FRESH_CHECK` — استعلام تازه permission از Gateway در همان اجرا: `is_member && can_send`؛ نامشخص → رد.
4. `DEST_TYPE_OK` — فقط `channel|group|supergroup`؛ **DM/شخصی/بات همیشه رد** (تست شماره ۶ پرامپت).
5. `RELEVANCE_OK` — وجود `context_message_id` یا keyword مرتبط در پنجره lookback؛ بدون context → رد.
6. `NOT_DUPLICATE` — ترکیب `(dialog_id + text_hash)` قبلاً ارسال نشده؛ `request_id` و `idempotency_key` تکراری → رد (replay).
7. `CAPS_OK` — سقف روزانه/فاصله زمانی/ساعت سکوت رعایت شده؛ وگرنه defer به روز بعد (نه ارسال اضافه).
8. `CLAIMS_OK` — متن حاوی جایزه/تخفیف/قانون/قیمت/ظرفیت تأییدنشده → رد یا علامت‌گذاری (تست شماره ۷).
9. `AUTO_STOP` — اگر آخرین خطای کمپین FloodWait/permission/spam بوده → کمپین auto-pause + اعلان ادمین؛ ادامه فقط با resume دستی.

- همه تصمیم‌ها در `policy_decisions` با actor=`policy-engine`، reason، timestamp و hash متن.
- Gateway هم لایه دفاع دوم است: expiry، idempotency، rate-limit، FloodWait کامل (توقف بقیه صف)، بدون retry تهاجمی.

### ۵٫۱ مسیر ارسال مستقیم مدیر (`send-direct` — بدون حصار کمپین، با ایمنی پایه)

مدیر خودش approval انسانی است، پس text-hash و حصار کمپین لازم نیست؛ ولی این چک‌ها **اجباری** است (fail-closed):
1. kill-switch سراسری خاموش + کمپین/سیستم pause اضطراری نباشد.
2. `DEST_FRESH_CHECK` — استعلام تازه permission همان لحظه: `is_member && can_send`.
3. `DEST_TYPE_OK` — فقط `channel|group|supergroup`؛ **DM حتی برای مدیر در v1 بسته** (قابل بازبینی بعدی).
4. `NOT_DUPLICATE` — `idempotency_key` اجباری؛ کلید تکراری → همان نتیجه قبلی (replay-safe، ضد دابل‌کلیک).
5. `CLAIMS_FLAG` — ادعای تأییدنشده (جایزه/تخفیف/قیمت/ظرفیت) **بلاک نمی‌کند** ولی در UI دیالوگ تأیید می‌خواهد و در لاگ flag می‌خورد.
6. ثبت کامل با actor=نام‌کاربری مدیر + متن-hash + نتیجه در همان جدول‌های §۶.

## ۶. مدل داده و migration (هر سه پرووایدر)

**در کد migration جدا نیست.** سه kind روی ops-records (`OpsCore.save/list`): `tg-campaign`، `tg-draft`، `tg-decision` (`TG_KINDS` در `policy.ts`). Idempotency با `core.command`. هر سه پروایدر بدون جدول SQL جدا.

- کمپین: textHash + fence + caps + status + approvedBy/At + expiresAt
- draft: campaignId، dialog، message، decision/status، telegramMessageId، error
- decision: actor، reason، textHash

## ۷. نقشه استفاده مجدد (ساخت دوباره ممنوع)

| نیاز | موجود در کد | استفاده |
|---|---|---|
| توکن Manus | `POST /api/admin/api-tokens` در `server/affiliate/igRoutes.ts` (توکن `baz_…`) | همان؛ scope جدید `manus` |
| HMAC پورتال→Gateway | `verifyHmac` در `server/publishing/webhooks.ts` | همان الگو (سرور امضا می‌کند، Gateway راستی‌آزمایی) |
| گارد ادمین | `requireAdmin` در `server.ts:828` + `core.guard` | برای approve/pause/revoke کمپین |
| Idempotency | `core.command(actor, key, …)` | برای drafts و send-command |
| Audit | `core.audit` + جدول‌های audit افیلیت | برای تصمیم‌ها و تأییدها |
| گزارش افیلیت | `AffiliateService.report` در `server/management/affiliates.ts` | پایه endpoint روزانه Manus |
| Vault سکرت | `SecretVault` در `server/publishing/settings.ts` | نگهداری session/کلید Gateway (env اولویت) |

## ۸. پنل مدیریت — تب تلگرام داخل استودیوی انتشار (UI)

نقطه اتصال دقیق (تأییدشده در کد): تب جدید `telegram` در **`shared/publishing/Studio.tsx`** + کامپوننت جدید **`shared/publishing/Telegram.tsx`** با همان الگو/استایل (`ui.tsx`) و چهارزبانه. چون کنسول مدیریت از همین استودیو استفاده می‌کند (`shared/management/Content.tsx` → `ContentConsole`)، تب خودکار هم در **پنل مدیریت** و هم در ادمین سایت دیده می‌شود.

امکانات تب (فقط ادمین، JWT):
1. **مشاهده و چک:** فهرست کمپین‌ها + وضعیت، صف `pending_approval`، لاگ ارسال‌ها و decisionها با reason_code، گزارش روزانه افیلیت.
2. **تغییر و تأیید:** ساخت/ویرایش کمپین + approve/pause/revoke؛ ویرایش کمپین `live` وضعیت را به **`draft`** برمی‌گرداند (باید دوباره approve شود).
3. **ارسال مستقیم مدیر:** composer دستی — انتخاب dialog از فهرست واقعی وریفای‌شده + متن + دکمه ارسال با دیالوگ تأیید (پست به کانال/گروه)؛ مسیر `send-direct` با چک‌های §۵٫۱.
4. **kill-switch سراسری ارسال** + نمایش منبع سکرت‌ها (host/panel) مثل تب settings موجود.

## ۹. امنیت (مطابق پرامپت Manus + قراردادهای ریپو)

- سکرت‌ها فقط env؛ `api_id/api_hash/phone/session/2FA/token/HMAC-key` هرگز در Git/log/response.
- Manus فقط Bearer `baz_` با scope محدود؛ approve فقط JWT ادمین (دو کانال جدا).
- امضای HMAC روی body خام + timestamp/expiry برای هر send-command؛ replay رد.
- Session تلگرام فقط server-side در Vault رمزنگاری‌شده؛ ساخت session فقط در ceremony تعاملی مالک.
- بدون PII مشتری در لاگ/گزارش؛ health تمیز؛ `protectedIntegrationSetting` موجود رعایت شود.

## ۱۰. تست‌ها (۱۲ پرامپت + ۴ اضافه)

1-۱۲. عین پرامپت: بدون approval هیچ send-command؛ غیرعضو رد؛ بی‌مجوز رد؛ منقضی رد؛ replay/تکراری رد؛ DM رد؛ ادعای تأییدنشده رد/flag؛ نبود داده افیلیت → `data_unavailable` (بدون صفر ساختگی)؛ بدون سکرت در log/response؛ **هیچ تستی ارسال واقعی نکند** (Gateway در تست mock)؛ FloodWait بدون retry فوری؛ بدون PII در گزارش.
13. مغایرت text_hash → `pending_approval` (نه ارسال). 14. خروج از حصار → `pending_approval`. 15. خطای FloodWait/permission → auto-pause کمپین. 16. توکن Manus نتواند approve کند (403).

## ۱۱. تحویل و بچ‌های اجرا (پس از «شروع کن»)

- **B1 — پورتال هسته:** ✅ اجرا — `server/manus/{policy,gateway,routes}.ts` + تست `tests/manus.test.mts`.
- **B2 — Gateway:** ✅ اجرا — `telegram-gateway/` (FastAPI + Telethon/FakeAdapter + تست پایتون).
- **B3 — تب تلگرام استودیو:** ✅ اجرا — `shared/publishing/Telegram.tsx` + تب در `Studio.tsx`.
- **B4 — داک و استقرار:** ✅ اجرا — `TELEGRAM_OPERATIONS.md` + `.env.example` + `railway.toml` + `/healthz`.
- **B5 — راستی‌آزمایی زنده (با مالک):** ❌ باز — ceremony سشن، سرویس Railway جدا، health واقعی، dialogs واقعی، ارسال نظارتی اول.

## ۱۲. اقدام‌های دستی مالک (در اجرا لازم می‌شود)

1. ساخت اپ تلگرام در my.telegram.org (`api_id/api_hash`) برای اکانت Bazino.
2. Ceremony ساخت session (شماره + کد ورود + 2FA) — تعاملی، یک‌بار.
3. ساخت سرویس Gateway روی Railway + ست env (URL داخلی، Bearer، HMAC secret) از مسیر امن.
4. تأیید صحت ادعاهای محتوایی (PS5/Xbox/۸۵ اینچ/VIP/FC 2026 شنبه‌ها از ۱۲ سپتامبر ۲۰۲۶).
5. تأیید کمپین اول + پذیرش ریسک spam-ban (§۱۳).

## ۱۳. ریسک‌ها (صادقانه)

- **Spam-ban اکانت تلگرام (ریسک اصلی، متوسط با حصار):** اتوماسیون user-account در گروه‌های ثالث همیشه ریسک دارد؛ حصار §۵ + توقف خودکار + سقف روزانه آن را کنترل می‌کند ولی صفر نمی‌کند. پذیرش با مالک.
- **Session = کلید اکانت:** فقط Vault سروری؛ هرگز در چت/Git.
- **انحراف‌های تطبیق از پرامپت Manus:** (الف) پورتال Express نه FastAPI؛ (ب) تأیید یک‌بار کمپین به‌جای هر draft (به دستور مالک)؛ (ج) endpoint ارسال روی Gateway. این سه باید به Manus هم اعلام شود چون قراردادش را مصرف می‌کند.
- **حجم کار:** ~۴ بچ + راستی‌آزمایی زنده؛ تست زنده فقط با تلگرام واقعی.
- **ارسال دستی مدیر:** مسئولیت محتوا با مدیر است ولی چک‌های §۵٫۱ (عضویت/مجوز تازه، ممنوعیت DM، idempotency) در v1 اجباری‌اند و قابل دورزدن از UI نیستند.
