# راه‌اندازی و استفاده از استودیوی انتشار V4

## مرز تحویل

کد در شاخهٔ `arena/01a07a2f-bazino-gamenet-portal` است. اجرای این نشست شامل بک‌اند، UI مشترک سایت/مدیریت، تست و build محلی است؛ **فراخوانی واقعی سرویس‌های دارای اعتبار و استقرار روی bazino.pro بدون شاهد انجام‌شده محسوب نمی‌شوند**. وضعیت دقیق انتشار و اتصال GitHub در `V4_DELIVERY.md` ثبت می‌شود.

## پیش‌نیازهای هاست

1. Node.js 22؛ `npm ci` و `npm run build`، سپس `npm start` روی سرویس موجود.
2. `JWT_SECRET` واقعیِ نصب قبلی حفظ شود؛ نصب واقعی نباید با رمز ادمین پیش‌فرض رها شود.
3. Volume ماندگار روی `/data` و `BAZINO_DATA_DIR=/data` برای دیتابیس SQLite، اصل رسانه و فایل‌های آمادهٔ انتشار. برای SQL Server/Mongo نیز فایل‌های مدیا همچنان Volume لازم دارند. Mongo برای تراکنش به replica set نیاز دارد. صرف تغییر نام پوشه اثبات Volume نیست.
4. برای ذخیرهٔ کلید از پنل، یک `BAZINO_SECRETS_KEY` تصادفی ۳۲بایتی با hex (۶۴کاراکتر) یا base64 بسازید و فقط در Secret Manager/متغیر هاست نگه دارید. آن را همراه backup امن حفظ کنید؛ نبود/تعویض اشتباه آن، credential رمزگذاری‌شده را غیرقابل‌خواندن می‌کند.
5. `PAYMENT_ONLINE_ENABLED=0` باقی بماند؛ SMTP و POS سخت‌افزاری فعال نمی‌شوند. دریافت حضوری نقدی/POS دستی است.

**کلیدها را در چت یا Git نگذارید.** اگر نصب sandbox با `--ignore-scripts` بود:

```bash
npm ci --ignore-scripts --no-audit --no-fund
(cd node_modules/better-sqlite3 && npx node-gyp rebuild --release --nodedir=/usr/local)
npm run prepare:media
```

`prepare:media` فقط بیت اجرایی ابزار بسته‌بندی‌شدهٔ ffprobe/ffmpeg را روی Unix اصلاح می‌کند. در نصب عادی، postinstall پروژه این کار را انجام می‌دهد. رسانه با Sharp و ffprobe واقعی بررسی می‌شود، نه ادعای MIME مرورگر.

## تنظیم Zernio

در «استودیوی انتشار → اتصال و تنظیمات»:

- شناسهٔ **حساب متصل Zernio** (`ZERNIO_IG_ACCOUNT_ID`) برای `@bazinopro`؛ نه Media ID یا ID شخصی دوست.
- API Key زرنیو با مجوزهای لازم؛ نام سروری `ZERNIO_API_KEY` یا مقدار رمزگذاری‌شدهٔ پنل.
- `ZERNIO_WEBHOOK_SECRET` دقیقاً برابر Secret همان subscription.
- دامنهٔ اصلی و timezone صریح؛ دامنهٔ پیش‌فرض `https://bazino.pro` است.
- مقدار env زرنیو اولویت دارد؛ پنل آن را به‌صورت host-managed نشان می‌دهد. برای تغییر منبع، انتقال آگاهانه انجام شود؛ پاک‌کردن فیلد پنل env را عوض نمی‌کند.

URL اصلی:

```text
POST https://bazino.pro/api/webhooks/zernio
GET  https://bazino.pro/api/webhooks/zernio/health
```

مسیر قدیمی `/api/integrations/zernio/webhook` به همان گیرنده وصل است و اکنون **امضای HMAC** می‌خواهد؛ توکن ingest راه دورزدن آن نیست. `webhook.test` معتبر هیچ پیام، کوپن یا کد تجاری نمی‌سازد و `outboundSent:false` برمی‌گرداند.

فهرست ۲۳ رویداد پیشنهادی در `ZERNIO_EVENTS_AND_ARCHITECTURE.md` است. برای دکمهٔ Follow، `message.received` در کنار `comment.received` لازم است. Analytics در subscription جدا:

```text
POST https://bazino.pro/api/webhooks/zernio/analytics
```

تنها `analytics.synced` و Secret مستقل `ZERNIO_ANALYTICS_WEBHOOK_SECRET`/پنل. نبود این کلید باعث fail-closed همین مسیر می‌شود، نه غیرفعال‌شدن گیرندهٔ اصلی.

**ابتدا دریافت/health و Test webhook را بررسی کنید؛ بعد کلید، حساب، کمپین و صف معلق را بازبینی و سوییچ «ارسال واقعی» را روشن کنید.** رندر HTML سایت با کد 200، پاسخ سلامت API نیست؛ پاسخ باید JSON همین گیرنده باشد.

## Manus و عامل‌ها

- رکورد `builtin-manus` و `defaultAgentId` یک‌بار در DB seed می‌شوند؛ انتخاب/disable مدیر در restart بازنویسی نمی‌شود.
- API Key سرویس Manus با توکن ورودی `baz_…` یکسان نیست. API Key برای تماس backend→Manus است؛ توکن publisher فقط اجازهٔ اعلام media_id به backend دارد.
- کلید قدیمی `manus_api_key` بر `MANUS_API_KEY` مقدم می‌ماند تا مهاجرت صریح. credential جدید پنل encrypted است؛ پاک‌کردن صریح آن، fallback مخفی به legacy/env ایجاد نمی‌کند.
- افزودن عامل: نام، نوع adapter، API Key و تنظیم profile/project؛ ذخیره و تست اتصال آگاهانه. Manus نخستین adapter اجرایی است. نوع ناشناخته ذخیره ولی `unsupported` نمایش داده می‌شود؛ صرف API Key آداپتور نمی‌سازد.
- تست خواندنی Manus اعتبار API را بررسی می‌کند، نه مجوز انتشار در اینستاگرام. عامل باید connector/دسترسی اجتماعی مجاز خودش را داشته باشد. کلید زرنیو، دادهٔ مشتری یا لینک خصوصی دوست در prompt او فرستاده نمی‌شود.
- API v2: `task.create` با `message.content` و `x-manus-api-key`؛ نتایج با `task.listMessages` خوانده می‌شوند. polling محدود باقی است تا webhook الزامی نباشد. callback اختیاری:

```text
POST https://bazino.pro/api/management/integrations/manus/webhook
```

کلید عمومی RSA از `webhook.publicKey` cache می‌شود. امضا روی timestamp + URL کامل + hash بایت اصلی و پنجرهٔ ۵دقیقه بررسی می‌شود؛ هیچ HMAC زرنیو جای آن را نمی‌گیرد. callback ناشناس، task شخص دیگر یا نسخهٔ قدیمی draft، اجازهٔ انتشار/overwrite ندارد.

مصرف اعتبار عامل به درخواست صریح و approval همان کار وابسته است؛ توقف task در API نمی‌تواند هزینهٔ مصرف‌شده را برگرداند. نتیجهٔ نامشخص به عامل/ناشر دیگری منتقل نمی‌شود.

## انتشار دستی و رسانه

- «پست‌ها → پست جدید»: عنوان داخلی، کپشن، زبان، قالب و رسانه را وارد کنید. تک‌تصویر، Carousel، Reel و Story با قواعد همان قالب؛ پذیرش واقعی Story/هر مقصد به مجوز و پاسخ سرویس وابسته است و در این نشست live تست نشده است.
- قالب رسانهٔ ورودی این نسخه: JPEG/PNG تا ۸MB و MP4 با H.264/HEVC، ۳ تا ۹۰ثانیه و ۲۳–۶۰fps تا ۳۰۰MB. اصل حفظ می‌شود؛ تصویر آمادهٔ preview با جهت صحیح و اندازهٔ مناسب، بدون crop پنهان ساخته می‌شود.
- فایل بزرگ به قطعه‌های حداکثر ۴MB تقسیم می‌شود؛ progress تعداد بایت تأییدشدهٔ سرور است. resume نیاز به انتخاب دوبارهٔ همان فایل دارد. کتابخانه خصوصی و preview یک قابلیت کوتاه‌عمر است؛ URL آن نباید ذخیره/منتشر شود.
- ترتیب اسلاید، کپشن، قالب و مقصد پس از «ذخیره → preview → تأیید همین نسخه» قفل می‌شوند. تغییرشان approval را باطل می‌کند.
- انتشار اکنون یا زمان‌بندی در timezone پست؛ فایل‌ها نزدیک زمان ارسال به Zernio stage می‌شوند، نه اتکا به URL temp منقضی‌شونده برای برنامهٔ چند هفته بعد.
- موفقیت upload یا پذیرش API، موفقیت انتشار نیست. job، receipt/reconciliation و Media ID واقعی ثبت می‌شوند. رندر پیش‌نمایش تقلید پیکسل‌به‌پیکسل همهٔ نسخه‌های Instagram نیست.
- پست عمومی بدون کمپین و Story وارد افیلیت نمی‌شود. Carousel افیلیت چهار اسلاید و کپشن ترکی دارد و انتشار داخلی کمپین در batch سه‌تایی از نسخه‌های مصوب است. اصل قواعد/متن‌های کمپین تغییر نکرده‌اند.
- حالت دستی با Zernio و بدون فراخوانی Manus کار می‌کند؛ حالت عامل با عامل منتخب. تغییر انتخاب پیش‌فرض، job جاری را برای ناشر دیگر کپی نمی‌کند.

## کمپین، دریافت دوست و مالی

- فعال‌سازی کمپین نیازمند حساب/زبان/شرایط تأییدشدهٔ مدیر است؛ افزودن Media ID یا دریافت external post به‌تنهایی مجوز نیست.
- همکار: PR توضیحی، سپس DM کد و متن آماده. دوست: کامنت همان کد زیر همان رسانه، PR Follow و سپس DM لینک. هر کامنت یک PR؛ فارسی/ترکی/انگلیسی/روسی مستقل و متن پایهٔ فارسی دوم مطابق سند است.
- `share_confirmed_by_friend_code` شاهد عملی/غیرمستقیم است؛ `button_event_only` و Like checkbox خوداظهاری هستند. فقط سیگنال واقعی Follow می‌تواند `follow_verified` باشد.
- Gate سایت روی `/ig/invite/:id`، با token مقید به دوست، consent، ورود و شمارهٔ تأییدشده و شرط‌های policy؛ کوپن مستقل هر دوست و owner-bound. لینک خصوصی در پیام همکار، لاگ و پاسخ او نیست.
- سیاست مالی تا تأیید مسئول/نرخ/مهلت بازپرداخت فعال نمی‌شود. مشتری جدید در اجرای فعلی: بدون سابقهٔ مثبت پرداخت در سفارش‌ها/سانس‌های مرجع. نرخ نمونه، خودکار مصوب محسوب نمی‌شود.
- کمیسیون بر مبلغ واقعی پرداخت‌شده و فقط یک صاحب؛ نقدی/POS دستی، سانس و مبلغ جدید بازی جدا از غذای متصل/رزرو پیش‌پرداخت‌شده. کد فرم معتبر بر انتساب لینک مقدم؛ کد نادرست به کد قبلی fallback نمی‌کند.
- مهلت refund در snapshot محافظت می‌شود؛ پس از آن تأیید، و تسویهٔ ماه بسته‌شده با اقدام ادمین به کیف پول. `wallet_credited` تحویل نقد نیست؛ تحویل نقد همان فرایند دو‌مرحله‌ای حضوری است. حساب کیف پول همکار باید به‌صورت معتبر متصل شده باشد.

## رسیدگی به خطا

- `delivery_unknown`: بدون retry کور. برای انتشار، «بررسی نتیجه» و metadata job؛ برای پیام، مشاهدهٔ پیام در Zernio/گفتگوی صحیح و ثبت صریح شناسه توسط مدیر. این شاهد `operator_confirmed` است، نه رسید خودکار provider.
- خطای قطعیِ قابل‌تکرار پس از رفع علت با اقدام صریح retry می‌شود؛ پنجرهٔ پیام و media/account دوباره بررسی می‌شوند.
- `AGENT_REQUIRES_ACTION` یا تغییر credential: به task همان عامل مراجعه کنید؛ job به عامل دیگری منتقل نمی‌شود.
- `MEDIA_NEEDS_REUPLOAD`/`MEDIA_STORAGE_NOT_CONFIGURED`: Volume، اصل فایل و دسترسی نوشتن را بررسی کنید؛ فایل جایگزین خودسرانه منتشر نمی‌شود.
- دادهٔ آمار unavailable با صفر واقعی فرق دارد. صفحهٔ خالی فوری delta، cursor را جلو نمی‌برد. آمار/اکتشاف از صف کامنت و دکمه اولویت پایین‌تری دارند.

## آزمون‌های قابل تکرار

```bash
npm run lint
npm --prefix "Management App/Bazino" run lint
npm run build
npm test
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --prefix tests/e2e-browser
node scripts/run-publishing-browser.mjs
```

روی Linux، `fonts-dejavu-core` نیز برای fallback سیریلیک لازم است؛ runner علاوه بر Vazirmatn آن را بررسی می‌کند. Workflow در صورت نبودن نصبش می‌کند.

runner مرورگر، production server و کاربران/کلیدهای **کاملاً آزمایشی** در پوشهٔ موقت می‌سازد؛ ارسال واقعی خاموش است، سپس فرایند سرور را restart و حفظ رسانه/تنظیمات را بررسی می‌کند. فایل‌های test credential در artifact خروجی نیستند. اجرای مستقیم سرور production قبل از runner به JWT/تنظیمات واقعی نیاز دارد؛ این دستور برای آزمون خودبسنده است.

قالب `docs/publishing/publishing-v4.workflow.yml` همین build/tests/Chromium را اجرا و شواهد را artifact می‌کند. اتصال GitHub فعلی اجازهٔ افزودن فایل فعال در `.github/workflows/` نداد؛ مدیر دارای دسترسی باید این فایل کامل را به `.github/workflows/publishing-v4.yml` منتقل کند یا مجوز workflows اتصال Arena را اصلاح کند. قالب خودکار فعال نشده است. سه پروایدر contract coverage دارند؛ این معادل اجرای واقعی روی SQL Server/Mongo میزبان نیست.
