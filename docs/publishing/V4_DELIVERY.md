# تحویل اجرای پلن V4 — بازینو

تاریخ: **2026-09-07** · شاخه: `arena/01a07a2f-bazino-gamenet-portal`

## وضعیت

**هشت بچِ توسعه و رگرسیون محلی اجرا شدند.** این تحویل صرفاً پلن نیست: بک‌اند، UI مشترک سایت/مدیریت، ثبت عامل، فایل/Composer، وب‌هوک و Gate واقعی سایت کد دارند. انتشار روی هاست و تماس واقعی سرویس‌های دارای اعتبار، جدا از تست محلی ارزیابی می‌شوند؛ نتیجهٔ واقعی اقدامات GitHub/استقرار و مجوزهای مسدود در بخش «انتشار» آمده است.

## انجام‌شده

1. ingest فقط `media_id` با توکن scoped، registry مصوب چندمنبعی و کنترل دقیق حساب/رسانه؛ مسیر قبلیِ ساخت لینک برای شریک بازنشسته شد.
2. گیرندهٔ HMAC روی raw body، مسیر اصلی و legacy مشترک، Analytics جدا، صف پایدار/اولویت تعامل، dedup/claim و `delivery_unknown` بدون retry کور.
3. چهار کلیدواژه/زبان، PR اول و DM دوم، کد فقط برای همکار و لینک فقط برای دوست؛ دکمه به هویت/مرحله مقید و سطح اثبات صادقانه.
4. `/ig/invite/:id` واقعی با رضایت، ورود/شمارهٔ تأییدشده، Like خوداظهاری، امضای محدود به دوست و کوپن مستقل owner-bound در تراکنش.
5. انتساب سروری، مبلغ پرداخت مرجع و سانس حضوری، مشتری جدید، یک صاحب کمیسیون، مهلت refund و تسویهٔ ماهانهٔ کیف پول؛ اعتبار کیف پول با تحویل نقد یکی نیست.
6. استودیوی مشترک، سوییچ دستی/عامل، Agent Registry و Manus پیش‌فرض ذخیره‌شده، credential رمزگذاری‌شده و وضعیت واقعی اتصال؛ نبود کلید آماده/موفق معرفی نمی‌شود.
7. upload قطعه‌ای، Sharp/ffprobe واقعی، اصل رسانه ماندگار، تصویر/Carousel/MP4/کاور، ترتیب/preview/approval و زمان‌بندی؛ آداپتورهای Zernio و Manus با job/credential snapshot و کنترل نتیجهٔ نامشخص.
8. اصلاح رگرسیون/API fixture، runner تولیدپذیرِ Chromium production، restart واقعی process، قالب Workflow جدید تست، راهنمای استقرار و شواهد قابل تحویل. pin تنظیمات واقعی عامل و رد generation منسوخ پیش از خرج اعتبار نیز با سه تست اضافه پوشش داده شد.

## آزمون نهایی — اجرا شد

| لایه | نتیجه | ماهیت |
|---|---:|---|
| فایل/نشر | 24/24 | فایل PNG/JPEG/MP4 واقعی، adapterهای خارجی mock |
| انتشار/افیلیت V4 | 54/54 | SQLite/منطق واقعی؛ تماس بیرونی mock |
| مدیریت | 41/41 | قرارداد و تراکنش |
| واحد | 99/99 | منطق خالص |
| دیتابیس | 38/38 | SQLite واقعی |
| SQL Server/Mongo | 27/27 | contract/mock؛ نه اتصال به سرور واقعی |
| UI | 42/42 | jsdom |
| API | 181/181 | Express production و SQLite واقعی، دریافت/پرداخت/OTP آزمایشی |
| **جمع** | **506/506؛ صفر fail/skip** | `npm test` |

- `npm run lint` و lint اپ مدیریت: موفق؛ TypeScript واقعی، نه transpile-only.
- `npm run build`: موفق؛ build سایت/اپ مدیریت/سرور. هشدارهای موجود bundle دربارهٔ `import.meta` در خروجی CJS ثبت شدند؛ boot واقعی production در تست‌ها موفق است.
- `node scripts/run-publishing-browser.mjs`: موفق؛ ۲۰ تصویر تمام‌صفحه، FA/EN/TR/RU و desktop/mobile، صفر خطای ثبت‌شدهٔ JS/overflow در journeyها.
- فرایند production واقعاً متوقف و با همان volume راه‌اندازی شد؛ اصل فایل، metadata، Manus پیش‌فرض و خاموش‌ماندن ارسال حفظ شدند.
- **بازبینی دیداری واقعی:** تصاویر با ابزار تصویر باز شدند. در اجرای اول، روسی به‌علت نبود fallback سیریلیک در fontconfig محیط نامرئی بود، با اینکه DOM سبز بود؛ DejaVu Sans اضافه و سوئیت production دوباره اجرا و تصاویر روسی مجدداً باز شدند. این مشکل رفع شد و پنهان گزارش نشد.
- خطاهای تاریخی API با fixtureهای احراز هویت واقعی، تاریخ معتبر و قرارداد cashout/settle فعلی تطبیق داده شدند؛ تست‌ها حذف/skip نشدند. آزمون‌های امنیت V4 نیز اضافه شدند.

شواهد تولیدپذیر: `tests/reports/*.json`، `tests/reports/v4-final-*.log` و `tests/e2e-browser/shots/v4/*`. این خروجی‌ها در Git قرار نمی‌گیرند؛ همراه ZIP شواهد یا artifact Workflow قابل تحویل‌اند. تمام حساب‌ها/کلیدها/رسانه‌ها/کوپن‌های تصاویر **fixture محلی** هستند، نه مشتری یا انتشار واقعی.

## انتشار و مجوزهای باقی‌مانده

- همهٔ هشت بچ کد روی شاخهٔ جلسه push شدند؛ commit کد/تست بچ ۸: `bfaff2b59c13a1c20f7f58f93c516cbc61c2dd0f`. اصلاح نهایی pin تنظیمات عامل و رد task منسوخ در commit `5b9ef0d823597bb757c9088b1a2bbac0e1ac4be7` نیز push شد.
- **PR #20:** https://github.com/paymanshafayan/bazino-gamenet-portal/pull/20 — از همین شاخه به main، بدون push مستقیم به main و بدون merge خودکار.
- سه check موجود GitHub روی **آخرین commit کد `5b9ef0d`** نیز موفق‌اند: backend build/boot (۱۹ثانیه)، frontend build (۲۸ثانیه) و Typecheck/Theme tests (۳۱ثانیه). شاهد: https://github.com/paymanshafayan/bazino-gamenet-portal/actions/runs/34133592889 . این سه check با سوئیت ۵۰۶تایی محلی یکی نیستند.
- GitHub App اجازهٔ افزودن فایل در `.github/workflows/` نداد؛ قالب کامل CI در `docs/publishing/publishing-v4.workflow.yml` محفوظ است. برای فعال‌سازی، مدیر باید مجوز **workflows** اتصال Arena را فراهم کند یا قالب را در مسیر `.github/workflows/publishing-v4.yml` قرار دهد.
- اجرای workflow استقرار موجود با `gh workflow run deploy.yml --ref arena/01a07a2f-bazino-gamenet-portal` واقعاً تلاش شد، اما **HTTP 403 Resource not accessible by integration** گرفت؛ permission اجرای Actions در اتصال فعلی کافی نیست. کد برای دورزدن مجوز یا trigger مخفی main merge نشد.
- Python/curl مستقیم health دامنه TLS/EOF دادند. مسیر جایگزین ابزار fetch موفق شد، ولی در URL health **HTML صفحهٔ عمومی سایت** برگشت، نه JSON گیرندهٔ V4. بنابراین **استقرار روی bazino.pro تأیید نشده/انجام‌شده گزارش نمی‌شود**.
- راه ادامهٔ مدیر: PR #20 را بررسی/merge و استقرار متصل main را اجرا کند، یا مجوز Actions/Workflows اتصال GitHub در Arena را اصلاح کند تا workflow از شاخهٔ فعلی اجرا شود. سپس health JSON و `webhook.test` امضاشده، Volume و تنظیمات امن بررسی شوند؛ صرف پاسخ HTTP 200 یا اشتراک Zernio کافی نیست.
- هیچ رمز/توکن GitHub/هاست در چت درخواست نشد. فایل CI کامل و راهنمای عملیاتی همراه ZIP است.

URL کد گیرنده، **پس از استقرار نسخهٔ جدید روی هاست**:

```text
POST https://bazino.pro/api/webhooks/zernio
GET  https://bazino.pro/api/webhooks/zernio/health
POST https://bazino.pro/api/webhooks/zernio/analytics
```

## مرزهای واقعی / کار وابسته به هاست و سرویس

- انتشار پست/PR/DM واقعی و مصرف اعتبار Manus/Zernio **انجام نشده**؛ کلید/حساب/approval محتوای مشخص و دسترسی سرویس لازم است. تست adapter موفق با تست live یکی نیست.
- هر عامل دلخواه فقط با API Key، خودکار پشتیبانی نمی‌شود؛ Manus نخستین adapter است و نوع نامعتبر `unsupported` می‌ماند.
- فایل ورودی این نسخه: JPEG/PNG تا ۸MB و MP4 تا ۳۰۰MB با قواعد codec/duration/ratio مستند در راهنما؛ ویرایشگر Canva، crop پنهان یا پشتیبانی بی‌قید همهٔ containerها ادعا نمی‌شود.
- Volume واقعی، کلید اصلی `BAZINO_SECRETS_KEY` و متغیرهای Zernio روی سرویس هاست باید تأیید شوند؛ صدور اشتراک Zernio به‌تنهایی استقرار receiver نیست.
- تست واقعی روی SQL Server/Mongo، حساب/مجوز Story و delivery واقعی provider همچنان تست‌نشده‌اند.
- سوییچ ارسال واقعی و سیاست مالی کمپین به‌صورت امن خاموش/نیازمند تأیید هستند؛ مبلغ نمونه/مدرک خوداظهاری، پرداخت یا فالو قطعی نیست.
- SMTP و سخت‌افزار POS متوقف، درگاه آنلاین خاموش. فقط در تست ایزولهٔ PayTR، mock با flag مخصوص فعال می‌شود؛ نه در هاست/preview یا برای تراکنش واقعی.

راهنمای استفاده/تنظیمات: [DEPLOY_AND_OPERATE.md](DEPLOY_AND_OPERATE.md). اصل سند کاربر و متون چهارزبانه تغییر نکرده‌اند. هیچ کلید خصوصی، `.env`، پایگاه دادهٔ runtime یا فایل اصلی مشتری در ZIP/Git تحویلی قرار نمی‌گیرد.

### بازبینی نهایی هزینه/عامل

در بازبینی پایانی دو مورد واقعی تکمیل شد: generation صف‌شده‌ای که draft آن به‌صورت دستی عوض شده، پیش از تماس هزینه‌دار superseded می‌شود؛ تغییر project/profile عامل با همان API Key نیز job مصوب قبلی را با تنظیمات تازه اجرا نمی‌کند. hash تنظیمات اجرایی مستقل از rename/زمان health-check است و درست پیش از درخواست عامل نیز کنترل می‌شود. سه آزمون افزوده شد؛ APIهای خارجی همچنان mock هستند.

## بستهٔ تحویل

`bazino-v4.zip` شامل سورسِ آخرین HEAD به‌علاوهٔ JSON/لاگ تست و ۲۰ تصویر واقعی در مسیرهای ignored است؛ داخل `DELIVERY_MANIFEST.json` commit دقیق بسته و مرز تست‌ها ثبت شده است. فایل ZIP و SHA-256 آن در خروجی Arena تحویل می‌شوند و در Git قرار نمی‌گیرند. `node_modules`، `.git`، دیتابیس runtime و credentialهای fixture در بسته نیستند.

## بازتأیید تحویل پس از درخواست «چه کار کردی؟ گزارش بده» — 2026-09-07

- در شروع بازبینی، metadata گیت محلی به پایهٔ قدیمی برگشته بود، اما **هر ۸۲۱ فایلِ شاخه با commit ریموت `660fd9a` بایت‌به‌بایت برابر بود**؛ تاریخچه/index با fast-forward تأییدشده بازگردانده شد، بدون تغییر، reset یا پاک‌کردن فایل‌های کاری. هیچ بخشی از محصول دوباره از صفر نوشته نشد.
- وابستگی‌ها از lockfile نصب، `better-sqlite3` با هدر محلی Node 22.22.3 ساخته و ابزار رسانه آماده شد. TypeScript سایت و مدیریت و build کامل production **دوباره موفق شدند**؛ هشدارهای CJS/import.meta قبلی باقی‌اند ولی boot واقعی موفق است.
- `npm test` دوباره اجرا شد: **506/506، صفر failure/skip**؛ توزیع لایه‌ها همان جدول بالاست. این نتیجه فقط نقل گزارش قبلی نیست.
- اجرای اول Chromium هنگام screenshot دیالوگ کمپین به timeout سی‌ثانیه رسید. **علت قطعی اثبات نشده است**؛ همان runner و همان کد بدون تغییر، این بار مستقل اجرا شد و کامل گذشت. لاگ شکست اولیه و تکرار موفق هر دو محفوظ‌اند؛ تست/تصویر حذف یا skip نشد.
- ۲۰ تصویر تازهٔ تمام‌صفحه تولید و **همه با ابزار تصویر باز و بررسی شدند**؛ FA/EN/TR/RU، موبایل/دسکتاپ، پنل سایت/مدیریت، Composer و Gate. در اجرای نهایی خطای JS/overflow ثبت نشد. restart واقعی دوباره حفظ فایل/metadata، Manus پیش‌فرض و خاموش‌بودن ارسال را تأیید کرد.
- PR #20 همچنان باز است و head کد بررسی‌شده روی ریموت تأیید شد؛ هر سه check موجود GitHub روی `660fd9a` سبز هستند (run `34133841959`). این سه check با ۵۰۶ تست محلی یکی نیستند.
- **استقرار دوباره واقعاً تلاش شد**: dispatch workflow موجود از شاخهٔ جلسه باز هم HTTP 403 `Resource not accessible by integration` داد. health دامنه از ابزار وب دوباره HTML سایت را برگرداند، نه JSON گیرنده؛ استقرار production همچنان تأیید نشده است. مدیر باید PR/استقرار main را انجام دهد یا مجوز Actions/Workflows اتصال Arena را اصلاح کند؛ credential در چت درخواست نمی‌شود.
- نتایج این بازاجرا در `tests/reports/v4-recheck-summary.json`، لاگ‌های `recheck-*` و تصاویر `tests/e2e-browser/shots/v4/` هستند؛ در Git نیستند و در ZIP تحویل قرار می‌گیرند. این نوبت تغییر محصول جدیدی نداشت؛ فقط شواهد و اسناد تحویل به‌روز شدند. تماس واقعی Manus/Zernio و SQL Server/Mongo زنده، همچنان تست نشده‌اند.
