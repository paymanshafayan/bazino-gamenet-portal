# پلن اتوماسیون تولید محتوا با Predis.ai + انتشار با Zernio

> تاریخ: ۲۰۲۶-۰۹-۱۳ · وضعیت: **پیشنهاد — منتظر تأیید کاربر** · هیچ کدی تغییر نکرده

## ۱. کشف کلیدی: مرحلهٔ «انتشار» از قبل کامل است

پرتال سیستم انتشار نسخهٔ ۴ (publishing v4) دارد که **همین حالا** با Zernio یکپارچه است:

- `ZernioClient` (server/publishing/provider.ts) — REST با Bearer key از SecretVault (AES-256-GCM) → `https://zernio.com/api/v1/...`
- انتشار واقعی: presign آپلود رسانه → `POST /v1/posts` → تأیید nativeId از طریق وب‌هوک HMAC (`/api/webhooks/zernio`) یا polling reconcile
- خط‌لولهٔ کامل Draft → Approve (fingerprint) → Schedule → Publish با CAS، lease، idempotency، audit
- قواعد کمپین افیلیت (۳ پست، ۴ اسلاید ترکی)، اعتبارسنجی aspect-ratio/caption، صف‌های durable (inbox/outbox)
- تولید متن کپشن از طریق **Manus** (`drafts/:id/generate` → pub-agent-task → workGenerations هر ۴ ثانیه)

پس سندِ «Zernio MCP» لازم نیست — پرتال خودش عامل است و یکپارچه‌سازی server-to-server (قوی‌تر از MCP) از قبل کار می‌کند.

**شکاف واقعی:** تولید **رسانهٔ بصری** (تصویر/کاروسل/ریلز) — الان ۱۰۰٪ دستی است. Predis دقیقاً همین لایه را پر می‌کند.

## ۲. یافته‌های API پریدیس (راستی‌آزمایی‌شده از مستندات رسمی)

- ساخت: `POST https://brain.predis.ai/predis_api/v1/create_content/` — هدر `Authorization: <API_KEY>`؛ پارامترها: `brand_id` (الزامی)، `text` (الزامی، ≥۲۰ کاراکتر)، `media_type` (single_image | carousel | video)، `video_duration` (short|long)، `input_language`/`output_language` (**turkish و english پشتیبانی می‌شوند؛ فارسی خیر**)، `n_posts` (۱–۱۰)، `headlines` (بازنویسی متن اسلایدها با محتوای خودمان — عنوان مسابقه، تاریخ، قیمت!)، `media_urls` (تصاویر خود سایت!)، `brand_details` (لوگو/پالت رنگ بازینو)، `template_ids`، `model_version` (۴ فقط single_image+carousel)
- پاسخ async: `{post_id, status: inProgress}` → نتیجه با `GET /predis_api/v1/get_posts/` → `{posts: [{post_id, urls[], caption, media_type}]}` (الگوی polling — هم‌راستا با الگوی فعلی pollPublications)
- خروجی: URL فایل‌های تولیدشده + کپشن — JSON ساختاریافته، بدون نیاز به داشبورد

## ۳. تصحیح هزینه‌ها (مهم — با سند مغایرت دارد)

| ادعای سند | واقعیت منابع |
|---|---|
| «پلن رایگان ۱۵ پست + API» | ۱۵ پست/ماه ✓ اما **با واترمارک**؛ و **API روی پلن Free/Lite نیست** — Lite صراحتاً «No API Access»، API روی پلن‌های بالاتر (addon یا Core $32) |
| «از $32/ماه با API گسترده» | Core ≈ $32/ماه = ۱٬۳۰۰ کردیت (~۴۰ پست یا ~۱۰ ویدیو)؛ یک منبع API را جزو Core می‌داند، دو منبع addon جدا — **باید قبل از ساخت با support پریدیس تأیید شود** |
| Zernio رایگان برای ۲ اکانت اول | بی‌ربط به کار ما — یکپارچه‌سازی Zernio از قبل انجام و پرداخت شده است (اکانت bazinopro) |

نتیجه: بودجهٔ واقعیِ شروع = تأیید دسترسی API با support پریدیس + احتمالاً $32/ماه. پلن رایگان فقط برای ارزیابی کیفی خروجی در داشبورد خودشان.

## ۴. معماری پیشنهادی (الگوی سازگار با کد موجود)

### فایل جدید: `server/publishing/predis.ts`
- `PredisClient` — constructor(core, fetcher) مثل ManusClient؛ متدهای `createContent()` / `getPosts()` با timeout/redirect:error و `ProviderFailure` (کدهای `PREDIS_HTTP_*`, `PREDIS_NOT_CONFIGURED`)
- `PredisService` — مدیریت `pub-predis-task` با همان الگوی CAS/lease پاب‌agent-task:
  - `generate(actor, body)` — {kind: tournament|promo|custom, tournamentId?, text, mediaType, language: tr|en, nPosts?} + `confirmedCost:true` → چک سهمیه → رکورد queued
  - `work()` — در همان حلقهٔ ۴ ثانیه‌ای publicationRoutes: submit برای queued، poll برای submitted (تطبیق post_id)، ذخیرهٔ urls+caption
  - `importToDraft(actor, taskId, {confirmed:true})` — دانلود URLها سمت سرور → AssetLibrary (ffprobe/aspect) → ساخت pub-draft تازه با نگاشت فرمت (single_image→image، carousel→carousel، video→reel) + کپشن (≤۲۲۰۰، فیلتر لینک خصوصی) + executionMode:'manual' (provider=zernio) → **رفتن به جریان تأیید انسانی موجود** — هرگز auto-approve نمی‌شود

### تغییرات جرئی در فایل‌های موجود
- `settings.ts`: افزودن `'predis_api_key'` به SECRET_NAMES (vault + fallback محیطی `PREDIS_API_KEY`)؛ فیلدهای کانفیگ: `predisBrandId`, `predisEnabled`, `predisMonthlyLimit` (پیش‌فرض ۱۵), `predisAutoTournament` (پیش‌فرض false)
- `routes.ts`: اندپوینت‌های `POST /predis/generate`، `GET /predis/tasks`، `POST /predis/tasks/:id/cancel`، `POST /predis/tasks/:id/import`، `GET /predis/quota` (guard content/publish)
- `publicationRoutes.ts`: فراخوانی predis.work() در تایمر موجود
- ترینگر (فاز ۲، config-gated): بعد از موفقیت `POST /api/admin/tournaments` → اگر predisAutoTournament → enqueue تولید با متن قالب‌بندی‌شده (عنوان/بازی/تاریخ/شهریه به tr یا en) — فقط draft، بدون انتشار خودکار

### UI (فقط پنل وب)
- تب «Predis» در Studio: نشان سهمیهٔ ماه، فرم تولید (نوع/رسانه/زبان)، لیست taskها با پیش‌نمایش، دکمهٔ Import→Draft
- سکرت predis_api_key فقط از پنل وب (`PUT /secrets/predis_api_key`) — طبق قانون حذف بخش‌های امنیتی، در اپ فلاتر ادمین نمی‌آید

### تست‌ها (الگوی tests/publishing.test.mts با fetcher ماک)
create→poll→import کامل، سهمیه/QUOTA_EXCEEDED، gating سکرت (409 PREDIS_NOT_CONFIGURED)، اعتبارسنجی کپشن/aspect (ریلز غیر 9:16 رد شود)، CAS/lease، ترینگر مسابقه (فعال/غیرفعال)، عدم auto-approve

## ۵. فازها
1. **فاز ۱ (هسته):** PredisClient + tasks + quota + import→draft + تست‌ها — بدون UI؛ قابل تست با curl
2. **فاز ۲ (UI + ترینگر):** تب Studio + ترینگر مسابقه
3. **فاز ۳ (اختیاری):** وب‌هوک ورودی پریدیس به‌جای polling، template_ids اختصاصی برند، کاروسل ۴اسلایدی افیلیت ترکی (headlines قطعی)

## ۶. گزینه‌های طراحی که رد شدند
- adapterId 'predis' در رجیستری agents — رجیستری agent = «ناشر» است (Manus منتشر می‌کند)؛ پریدیس «مولد رسانه» است؛ قاطی کردن دو نقض، audit/approval را پیچیده می‌کند. الگوی پیشنهادی: پریدیس فقط به pub-draft با provider=zernio خوراک می‌دهد.
- استفاده از Zernio MCP — یکپارچه‌سازی REST+HMAC موجود قوی‌تر و تست‌شده است.

## ۷. بررسی جایگزین‌ها با API روی پلن رایگان (۲۰۲۶-۰۹-۱۳)

### نتیجهٔ مقایسه (راستی‌آزمایی‌شده از صفحات قیمت رسمی)

**قالب‌محور (تصویر با متن برند به هر زبانی — از جمله فارسی):**

| سرویس | API رایگان | تکرارشونده؟ | واترمارک | ویدیو | نکته |
|---|---|---|---|---|---|
| **Imejis.io** 🏆 | **۱۰۰ رندر/ماه** | ✓ دائمی | ✗ | ✗ | API سینکرون (جواب مستقیم در همان پاسخ)، ۵۰ دیزاین، ادیتور Canva-like، MCP، Unsplash داخلی |
| APITemplate.io | ۵۰ تصویر/ماه | ✓ دائمی | — | ✗ | فقط ۳ قالب؛ قالب HTML/CSS (دوست-توسعه‌دهنده) |
| Templated.io | ۵۰ کردیت | ✗ تریال یک‌باره | ✗ | ✓ MP4 | بعدش $29/ماه؛ ایمپورت Canva؛ ویدیو ۱۰ثانیه ≈ ۱۳ کردیت |
| Placid / Bannerbear / Contentdrips | تریال ۱۴-۳۰ روزه / ۱۰تایی | ✗ | Placid ✓ | ✓ (جدا) | گران ($19-49/ماه) |

**تولید خام AI:**

| سرویس | API رایگان | حجم | نکته |
|---|---|---|---|
| **Cloudflare Workers AI (FLUX.1-schnell)** 🏆 | ۱۰٬۰۰۰ neuron/روز | **~۱۷۰ تصویر/روز** | دائمی، بدون کارت، REST ساده، بدون واترمارک؛ زیرساخت مطمئن کلادفلر |
| Gemini image API | نامطمئن | — | طبق مارس ۲۰۲۶ مدل‌های تصویری جدید «Free Tier: Not available»؛ مدل قدیمی ۲.۵ بسته شد — اتکا نشود |

**ویدیو/ریلز رایگان واقعی وجود ندارد** — JSON2Video (۶۰۰ کردیت یک‌باره + واترمارک)، Shotstack (sandbox واترمارک‌دار)، Templated تریال (~۳-۴ ویدیو). مسیر واقعاً رایگان: **ffmpeg خود پرتال** (اسلایدشو/زوم از اسلایدهای تولیدی) — ابزارش از قبل هست.

**کپشن:** تولید متن از قبل در پرتال هست (عامل Manus `drafts/:id/generate`) — هزینهٔ جدید صفر.

### نتیجه‌گیری: معماری پیشنهادی به‌روزشده — «Imejis + Cloudflare FLUX» به‌جای Predis

- **پس‌زمینهٔ هنری گیمینگ:** FLUX کلادفلر (رایگانِ روزانه) → تصویر AI حماسی
- **اسلایدهای برند‌دار با متن واقعی:** قالب‌های Imejis (۱۰۰ رندر/ماه رایگان، بدون واترمارک) — متن فارسی/ترکی/انگلیسی دقیق (برتری نسبت به Predis که فارسی ندارد!)
- **کپشن:** عامل Manus موجود
- **خروجی → همان خط‌لولهٔ pub-draft → تأیید انسانی → Zernio**
- پیاده‌سازی باید **provider-agnostic** باشد (اینترفیس `TemplateImageProvider` با دو پیاده‌سازی اولیه: imejis / apitemplate) تا اگر Imejis (تأمین‌کنندهٔ جوان) شرایطش را عوض کرد، سوییچ کند.
- Predis همچنان گزینهٔ «همه‌کارهٔ پرمیوم» می‌ماند اگر بعداً $32+API پرداخت شد — همان PredisService قبلی به‌عنوان سومین provider.

### مقایسهٔ نهایی با Predis (چرا این ترکیب برای بازینو بهتر است)

| معیار | Predis (پولی) | Imejis+FLUX (رایگان) |
|---|---|---|
| هزینهٔ تست | ~$32+ | $0 |
| متن روی تصویر فارسی | ✗ (فقط زبان‌های لیست‌شده، fa نیست) | ✓ (متن قالب دست خودمان) |
| ثبات برند | متغیر (AI آزاد) | ✓ عالی (قالب ثابت) |
| ویدیو/ریلز | ✓ | ✗ (بعداً ffmpeg/پولی) |
| «آفرینش کامل از صفر» (کپی+طرح+استاک) | ✓ | نیمه (قالب‌ها یک‌بار طراحی می‌شوند) |

## ۸. پیش‌نیازهای کاربر (به‌روزشده)
1. **بدون نیاز به پرداخت** — برای تست: اکانت رایگان Imejis.io + اکانت رایگان Cloudflare (Workers AI token)
2. تأیید پلن برای شروع فاز ۱ (الان با معماری provider-agnostic و Imejis به‌عنوان provider اول)

## ۹. فاز ۱ — پیاده‌سازی شد (۲۰۲۶-۰۹-۱۳)

**کامیت‌شده در برنچ arena:** هستهٔ mediagen با معماری نهایی (Imejis + Cloudflare FLUX، provider-agnostic از روز اول).

| قطعه | فایل | شرح |
|---|---|---|
| تایپ‌ها | `shared/publishing/types.ts` | `MediaGenProvider` ('imejis'\|'flux')، `MediaGenTask` (queued→rendering→completed/failed→imported، lease برای worker) |
| کانفیگ | `server/publishing/settings.ts` | ۴ سکرت جدید (`imejis_api_key`، `cloudflare_api_token`، `cloudflare_account_id`، `cloudflare_zone_id`) + فیلدهای `mediagenEnabled/Designs/ImejisLimit/FluxLimit` + حفاظت و اعتبارسنجی |
| سرویس | `server/publishing/mediagen.ts` | `MediaGenService`: enqueue با idempotency (fingerprint)، worker با lease، quota ماهانهٔ UTC، ImejisProvider (POST `render.imejis.io/v1/{designId}`، هدر `dma-api-key`، پاسخ باینری)، FluxProvider (Workers AI REST، هر دو شکل پاسخ باینری/JSON-base64)، استخراج account-id از zone-id، import خروجی از طریق همان مسیر chunk/finalize کتابخانهٔ رسانه (اعتبارسنجی sharp بازاستفاده می‌شود) |
| روت‌ها | `server/publishing/routes.ts` | GET `mediagen/quota`، GET `mediagen/tasks`، POST `mediagen/generate`، POST `tasks/:id/cancel`، POST `tasks/:id/import` — همه پشت guard('content')/guard('publish') |
| worker | `server/publishing/publicationRoutes.ts` | `mediagen.work()` در همان حلقهٔ ۴ ثانیه‌ای موجود |

**ضمانت‌های حفظ‌شده:** `confirmedCost` اجباری روی هر generate؛ `confirmed` اجباری روی cancel/import؛ خروجی فقط pub-draft با `executionMode:'manual'` — خط تأیید انسانی (approve→schedule) دست‌نخورده؛ هرگز auto-publish نمی‌شود؛ quota ماهانه جدا برای هر provider.

**تست‌ها:** ۶ تست ماک‌شدهٔ جدید در `tests/publishing.test.mts` (قرارداد دقیق درخواست Imejis، idempotency، quota، خطای provider، import→draft فقط دستی، cancel/مالکیت) — مجموعهٔ کامل **652/652 سبز** + smoke-test زندهٔ سرور بیلدشده (بوت واقعی، فعال‌سازی از پنل، صف→worker→خطای اتصال ثبت‌شده، cancel، duplicate). تست لایو سرویس‌های خارجی در سندباکس ممکن نیست (شبکه به api.cloudflare.com/render.imejis.io بلاک) — پس از ست‌شدن سکرت‌ها روی Railway با یک دیزاین واقعی تست می‌شود.

**مرحلهٔ بعد (فاز ۲):** UI پنل (تب mediagen در بخش انتشار)، انتخاب دیزاین از allowlist، پیش‌نمایش خروجی قبل از import. سکرت‌های لازم: `IMEJIS_API_KEY` (کاربر در حال ساخت)، `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ZONE_ID` (موجود)، `CLOUDFLARE_ACCOUNT_ID` (اختیاری — خودکار از zone مشتق می‌شود).
