# BAZINO PRO — سند انتقال کامل (Handoff) برای ادامه‌ی کار در چت جدید

> این سند طوری نوشته شده که یک نشست تازه‌ی Claude، بدون هیچ حافظه‌ای از این گفتگو، بتونه دقیقاً از همینجا ادامه بده. لطفاً این فایل رو همراه فایل zip پروژه به چت جدید بدید و بگید «این سند رو بخون و طبق بخش \"کار بعدی\" ادامه بده».

---

## ★ به‌روزرسانی ۲۰۲۶/۰۹/۰۷ — بچ‌های ۱۰ تا ۱۳ (نشست `arena/01a07603-…`)

**وضعیت گیت:** همهٔ این کارها روی برنچ `arena/01a07603-bazino-gamenet-portal` کامیت و با PR به `main` فرستاده شده (کاربر merge می‌کند). جزییات اجرایی هر بچ در `docs/management/EXECUTION_LOG.md`.

### انجام‌شده در این نشست
- **بچ ۱۰ — تورنومنت‌های عمومی/زنده:** فصول ۴گانه (بهار/تابستان/پاییز/زمستان) با امتیاز رتبه‌بندی هفتگی ۵/۲/۱ و ویژه ۱۰/۴/۲ (جدا از Credits)؛ فصل و متادیتای تورنومنت روی OpsRecord بدون تغییر اسکیما؛ پیرینگ دستی زنده + BYE + صعود خودکار؛ پخش SSE + پولینگ؛ صفحهٔ عمومی جدید `src/components/tournaments/EventsTab.tsx` (تب‌های هفتگی/ویژه/رتبه فصل/براکت زنده+حالت تلویزیون/ثبت‌نام) با تم فعلی؛ پنل برنامه‌ریز تورنومنت سایت `src/components/admin/AdminTournamentPlanner.tsx`؛ کنسول مدیریت `shared/management/Tournaments.tsx` به‌روز شد.
- **بچ ۱۱ — درایور پیامک Messaggio** در `server/sms/index.ts` (`SMS_PROVIDER=messaggio`، هدر `Messaggio-Login`=$MESSAGGIO_PROJECT_LOGIN، `sms.from`=$MESSAGGIO_SENDE_CODE). fallback سکرت برای MANUS/ZERNIO هم اضافه شد.
- **بچ ۱۲ — پنل پیامک گروهی تبلیغاتی** (`server/management/messaging.ts` + پنل `src/components/admin/AdminMessagingPanel.tsx`، ساب‌تب `messaging`): ارسال کمپین روی SMS/Viber/WhatsApp؛ کانال بدون کلید → شبیه‌ساز؛ مخاطب OTP + شماره دستی؛ تاریخچه کمپین.
- **بچ ۱۳ — کمپین اینستاگرام/Manus:**
  - اندپوینت `POST /api/integrations/instagram/partner-invite` — Manus **Instagram account id** می‌فرستد (نه media id)، **کد یکتا + لینک دعوت امضاشده HMAC** می‌گیرد؛ idempotent. شرح کامل در `docs/payments/AFFILIATE-IG.md` (فاز ۳).
  - **سیستم توکن استاندارد** در پنل `/admin/affiliates` (بخش «توکن‌های دسترسی»): ساخت/کپی بدون نمایش/تغییرنام/حذف توکن `baz_<hex>`؛ مسیرهای `/api/admin/api-tokens`؛ یک توکن هم برای Manus (Bearer) هم برای وب‌هوک Zernio معتبر است؛ در `integration_api_tokens` (سکرت) ذخیره می‌شود.

### باقی‌مانده / تست‌نشده (زیرساخت، نه کد)
- **ارسال واقعی پیامک** با Messaggio: باید روی هاست `SMS_PROVIDER=messaggio` + سکرت‌ها ست شوند و یک ارسال زنده تست شود (کد/شکل درخواست تست‌شده، تماس زنده نه).
- **Viber/WhatsApp** برای پیامک گروهی به `MESSAGGIO_VIBER_CODE` / `MESSAGGIO_WHATSAPP_CODE` نیاز دارند؛ واتساپ خارج از پنجرهٔ ۲۴ساعته قالب تأییدشده می‌خواهد.
- **Zernio واقعی** (PR/DM/follow-status) به `ZERNIO_API_KEY` + `ZERNIO_IG_ACCOUNT_ID` (+`ZERNIO_WEBHOOK_SECRET` در پروداکشن) نیاز دارد. فعلاً کاربر مدیریت زرنیو را به Manus سپرده؛ برای همین فاز فقط **توکن پنل کافی است**.
- **اتصال واقعی Manus** به `partner-invite` با توکن پنل باید در محیط زنده تأیید شود.
- **دامنهٔ لینک دعوت:** `ig_invite_base_url` (پیش‌فرض `https://bazino.pro`) باید روی دامنهٔ نهایی باشد.
- **محدودیت تست این سندباکس:** `node_modules` بین نوبت‌ها پاک شد و نصب مجدد به‌خاطر بلاک شبکه (بیلد native better-sqlite3 → node headers) ممکن نشد. آخرین اجرای کامل سبز: واحد ۹۹/۹۹، مدیریت ۴۱/۴۱، دیتابیس ۳۸، پرووایدر ۲۷، UI ۴۲؛ API ۱۴۷/۱۶۹ (۲۲ خطا از-قبل-موجود روی main). در CI/هاست با شبکه: `npm ci` و کل سوییت باید سبز باشد. تایپ‌چک/esbuild هر دو سبز بود.

---


## ۱. معرفی کلی پروژه

**BAZINO PRO** یک پلتفرم مدیریت گیم‌نت با چهار بخش:

| بخش | مسیر | نقش |
|---|---|---|
| سایت/اپ مشتری | ریشه‌ی پروژه (`src/`, `server.ts`) | React 19 + Vite + **Express (Node.js) — بک‌اند رسمی و تنها بک‌اند production** |
| نرم‌افزار مدیریت داخلی | `Management App/Bazino` | React جدا — نرم‌افزار صندوق/مدیریت گیم‌نت (۲۸ مورد چک‌لیست GameCenter.md) |
| اپ موبایل | `flutter_app` | Flutter — متصل به بک‌اند واقعی (لاگین JWT، چت WebSocket، رزرو/سفارش/تورنومنت واقعی، دستیار جارویس) |
| فیچر تولید کد C# | کامپوننت‌های Viewer | فقط ویژگی نمایشی/مستندسازی، نه بک‌اند واقعی (`server/GameNet.*` حذف شده) |

### تصمیمات معماری کلیدی (اجرا شده)
- **Node.js/Express = تنها بک‌اند رسمی.**
- سه دیتابیس (SQLite/SQL Server/MongoDB) از طریق `server/dataProviders.ts` **همگی واقعی** (درایورهای `better-sqlite3`/`mssql`/`mongodb`).
- احراز هویت **واقعی و per-user** با JWT.
- دامنه‌ی سایت: `https://bazino.pro` (پشت Cloudflare). سرور اپ فلاتر هم `https://bazino.pro`.

---

## ۲. وضعیت کامل چک‌لیست ۲۸ موردی GameCenter.md — همه ✅

| # | ویژگی | وضعیت |
|---|---|---|
| ۱ | مدت بازی بر اساس مبلغ پرداختی | ✅ |
| ۲ | صدای هشدار اتمام بازی | ✅ |
| ۳ | تکرار زنگ و تغییر صدا (هر `repeatIntervalSeconds`) | ✅ رفع شد (`types.ts`: `lastAlarmAt` + شاخه‌ی FINISHED در تایمر `App.tsx`) |
| ۴ | چراغ‌های هشدار | ✅ |
| ۵ | تعرفه‌ی ساعات خاص روز | ✅ رفع شد |
| ۶ | خدمات ویژه با نام/مبلغ دلخواه | ✅ |
| ۷ | حسابداری موجودی بوفه | ✅ |
| ۸ | محاسبه‌ی سود بوفه | ✅ |
| ۹ | تغییر تعرفه حین بازی | ✅ رفع شد |
| ۱۰ | جابه‌جایی صورت‌حساب بین ایستگاه‌ها | ✅ |
| ۱۱ | باز/بسته کردن تایم مشتری (OPEN) | ✅ |
| ۱۲ | ۲۰ تم گرافیکی — اعمال واقعی در کل اپ | ✅ رفع شد (`src/utils/theme.ts` + `applyAppTheme` با CSS variables) |
| ۱۳ | طراحی گرافیکی کلوپی | ✅ |
| ۱۴ | کیف پول و شارژ مشتری | ✅ رفع شد |
| ۱۵ | محدودیت دسترسی اپراتور | ✅ |
| ۱۶ | رده‌بندی و تخفیف بر اساس ساعت بازی | ✅ رفع شد |
| ۱۷ | تولد مشتری و تخفیف | ✅ رفع شد (`getBirthdayFlags` + `customersWithBirthdayFlags` در `App.tsx`) |
| ۱۸ | بدهکاری/بستانکاری کیف‌پول | ✅ رفع شد |
| ۱۹،۲۰ | پرداخت قبل/بعد بازی | ✅ |
| ۲۱ | رند کردن مبلغ | ✅ |
| ۲۲ | تفکیک نقد/کارتخوان | ✅ |
| ۲۳ | پشتیبان‌گیری خودکار روزانه | ✅ رفع شد (snapshot تاریخ‌دار در localStorage + چک ۲۴ساعته + سوییچ UI) |
| ۲۴ | ثبت هزینه‌ها | ✅ |
| ۲۵ | نمودار ستونی ماهانه | ✅ رفع شد (واقعی از invoices) |
| ۲۶ | مقایسه‌ی دو ماه | ✅ رفع شد |
| ۲۷ | ساعت کارکرد ایستگاه — ریست روزانه | ✅ رفع شد (`lastServiceHoursResetDate` + چک هر دقیقه) |
| ۲۸ | حفظ اطلاعات هنگام قطع برق | ✅ رفع شد (`GET/POST /api/state` در `server.ts` + persist در localStorage) |

---

## ۳. کارهای تکمیل‌شده بعد از چک‌لیست (تاریخچه در `SESSION_SUMMARY.md`)

- باگ صفحه‌ی خالی روی مرورگرهای قدیمی/iPhone: `build.target` → `es2018` + fallback رنگ oklch (بخش ۱۶–۱۷)
- حذف پوشه‌ی `server/GameNet.*` به درخواست کاربر (بخش ۱۸)
- نسخه‌ی دسکتاپ مستقل Management App + اتصال واقعی به سرور سایت با Web Sync (بخش ۲۱)
- راهنمای تصویری (بخش ۲۳)، ری‌دیزاین فلاتر Neon Glass (بخش ۲۴)، رفع خطاهای Dart (بخش ۲۵–۲۹)
- موتور قالب‌بندی جدید: هر قالب فایل CSS مجزا + نصب ZIP (theme.json + theme.css + assets/ + theme.js) + `server/themeStore.ts` + SDK (بخش ۳۳)
- منبع داده نمونه/دیتابیس با سوییچ از پنل ادمین، پیش‌فرض: نمونه (بخش ۳۴)
- قانون لوگوی سایت مادر `/logo.png` + `brand-logo-guard` (بخش ۳۵)
- حذف برندینگ Google AI Studio (بخش ۳۶)
- CI: `.github/workflows/build-test.yml` (تایپ‌چک + تست قالب + بیلد فرانت/بک + بوت + smoke تست ۹ endpoint) (بخش ۳۷)
- بهینه‌سازی GTmetrix دور اول: تصاویر، کد اسپلیتینگ، کش، فونت‌ها، lazy loading (بخش ۳۸)
- دامنه‌ی فلاتر: `bazino.pro` (بخش ۴۰)
- **پاکسازی کامل پروژه (بخش ۴۳):** حذف ۸۱۳ فایل زائد/تکراری — ۴ پوشه‌ی اسکیل AI (`.claude/.cursor/.gemini/.windsurf`)، کپی‌های قدیمی سایت/مدیریت داخل `flutter_app` (حالا فقط Flutter خالص است: `lib/` + پلتفرم‌ها + pubspec)، `greeting.zip`، و پرامت نصب اسکیل. `.gitignore` هم با `*.zip` و پوشه‌های AI به‌روز شد.

---

## ۴. کار اخیر — بررسی گزارش GTmetrix (۱۱ آگوست ۲۰۲۶) + رفع TBT (بخش ۴۱–۴۲ SESSION_SUMMARY)

گزارش `GTmetrix-report-bazino.pro-20260811T132722-56nZVqpM.pdf`: **Performance 54% | Structure 93% | LCP 2.0s | TBT 729ms | Speed Index 4.4s | CLS 0.07 | TTFB 329ms | حجم 1.19MB/50req**.

### ریشه‌های پیدا و رفع‌شده:

1. **«LCP was lazy loaded»** → hero تم `GamingAmpHome.tsx` (و `DarkGoldHome.tsx`) با `loading="lazy"` بود → `eager` + `fetchpriority="high"` + `w=1920→1600`. (hero پیش‌فرض dark-gold در `HomeTab.tsx` از قبل eager بود.)
2. **TBT 729ms (عامل اصلی افت امتیاز)** → سه مشکل:
   - مودال‌های lazy (`VisualHelpGuide`, `AuthModal`, `ThemeSelectorModal` 135KB + motion) **بدون شرط mount** می‌شدند → چانک‌شان در startup دانلود/اجرا می‌شد (در Waterfall گزارش دیده می‌شد). → **شرطی شدند** (`{isHelpOpen && ...}` و...). هر سه داخلاً `return null` می‌کنند، پس بی‌خطر بود.
   - fetchهای غیربحرانی (articles/transactions/coupons/user) هم‌زمان با بحرانی‌ها → به `requestIdleCallback` (fallback `setTimeout 2000ms`) منتقل شدند. بحرانی‌ها (systems/cafe/accessories/tournaments) همان‌جا ماندند.
   - باندل اصلی 345KB → با `manualChunks` جدا کردن `vendor-react` (react/react-dom/scheduler): **index 333KB→151KB** (gzip 109→49KB) + vendor-react 193KB جدا (کش دائمی).
3. **انیمیشن‌های non-composited (4 عنصر)** → `transition-all` همراه `scale` در تصاویر hero/کارت‌ها در `HomeTab`, `DarkGoldHome`, `GecoPurpleHome`, `ShopTab`, `CafeTab` → `transition-transform` / `transition-[transform,opacity]`.

### یافته‌ی جانبی مهم: تایپ‌چک واقعی هر دو پروژه تمیز شد

- `@types/react`/`@types/react-dom` به `Management App/Bazino/package.json` اضافه شد (نبود → `tsc` خطای مجازی ErrorBoundary می‌داد).
- با نصب تایپ‌ها، **۲ خطای تایپی واقعی پنهان** در `Management App/Bazino/src/App.tsx` پیدا و رفع شد (`let nextStatus: StationStatus = ...`).
- حالا `tsc --noEmit` در **ریشه و Management App هر دو صفر خطاست** و `vite build` هر دو موفق است.

### محدودیت تست (مهم):
- در sandbox **نه** Flutter SDK، **نه** بیلد native `better-sqlite3` (شبکه به nodejs.org مسدود است) و **نه** Chrome/Chromium (دانلود مسدود) موجود است. پس: تست واقعی مرورگر، بوت سرور کامل، و Lighthouse/GTmetrix محلی **ممکن نیست** — فقط `tsc` + `vite build` (که انجام شد) و syntax check.

---

## ۵. کار بعدی (اولویت این برنچ — `arena/01a070af-bazino-gamenet-portal`)

> به‌روزرسانی ۲۰۲۶/۰۹/۰۵: **اول `HANDOFF_PROMPT.md` بخش ۱۳**؛ Windows 10/11 مشخص شده، اما پروتکل فرمان فروشِ این نصب هنوز به دست نیامده. پلن اصلی تأیید شده؛ تستر جدید تأیید نشده و «شروع کن» صادر نشده. پایهٔ این نشست `daf4791` است. نام شاخه‌های قبلی در تاریخچه، دستور تغییر شاخه یا reset نیست.

1. **اولویت — پلن توسعهٔ مدیریت تأیید شده؛ منتظر «شروع کن»:** `docs/management/EXPANSION_PLAN.md`. رزرو روی ایستگاه، کافه/فروشگاه، افیلیت و کیف پول، کوپن/ساعات ویژه، تورنمنت و محتوا با Manus. کاربر صریحاً تعیین کرد: نقدی/POS فقط برای دریافت‌های حضوری؛ کیف پول سایت باقی بماند؛ تسویهٔ کیف پول یعنی نقدکردن موجودی؛ سوشیال نسخهٔ اول Instagram + Telegram. محتوا و کوپن/ساعات ویژه در هر دو پنل. هیچ کد محصولی برای این پلن نوشته نشده است.
2. **POS — تصاویر بررسی شدند:** `docs/payments/POS_DEVICE_REVIEW.md`. تطابق بصری بسیار قوی با **Desk/2600**؛ MagicBox/Ethernet و نوشتهٔ İş Bankası دیده شدند. راهنمای رسمی، USB-B Slave را برای صندوق معرفی می‌کند. فقط MODEL/SKU/نسخهٔ برنامه و ECR/SDK همین نصب هنوز نیازمند تأییدند؛ عکس جلو/پایه/رسید دوباره لازم نیست. اتصال عملی/کنترل خودکار دستگاه جزو پلن فعلی نیست.
3. موتور افیلیت و کمپین Media-ID/Friend Gate از نشست قبل وجود دارند؛ تب مدیریت و ماژول نشر جدید باید از آن‌ها بازاستفاده کنند، نه موازی‌سازی. تست مرورگری این نوبت انجام نشده است.
4. باقی کارهای قدیمی (GTmetrix / Flutter و غیره) بدون دستور جدید اولویت این بسته نیستند.

---

## ۶. نکات فنی مهم برای ادامه‌ی کار

- **در این sandbox:** `node_modules` را می‌توان با `npm install --ignore-scripts` نصب کرد (فقط تایپ‌چک/بیلد فرانت)؛ بیلد native بهتر-sqlite3 **نمی‌شود**. برای تایپ‌چک: `./node_modules/.bin/tsc --noEmit` (ریشه و `Management App/Bazino` هر دو).
- بیلد فرانت: `npx vite build` (ریشه) و `cd 'Management App/Bazino' && npm run build`.
- کاربر فارسی‌زبان است و با جزئیات فنی دقیق و صادقانه پاسخ می‌گیرد؛ اگه چیزی رو نمی‌تونی تست کنی، صادقانه بگو.
- فایل‌های وضعیت (`ARCHITECTURE.md`, `ISSUES_FOUND.md`, `SESSION_SUMMARY.md`) رو بعد از هر batch به‌روزرسانی کن.
- در پایان هر batch، پروژه رو zip کن و به کاربر بده — کاربر همیشه فایل نهایی زیپ‌شده می‌خواد.
- Management App آدرس API هاردکد ندارد؛ همه‌ی fetchها relative هستند و در حالت co-located کنار سرور سایت سرو می‌شود (حالت standalone برای دسکتاپ از Web Sync استفاده می‌کند).
