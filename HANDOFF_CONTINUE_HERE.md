# BAZINO PRO — سند انتقال کامل (Handoff) برای ادامه‌ی کار در چت جدید

> این سند طوری نوشته شده که یک نشست تازه‌ی Claude، بدون هیچ حافظه‌ای از این گفتگو، بتونه دقیقاً از همینجا ادامه بده. لطفاً این فایل رو همراه فایل zip پروژه به چت جدید بدید و بگید «این سند رو بخون و طبق بخش \"کار بعدی\" ادامه بده».

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

## ۵. کار بعدی (اولویت‌بندی پیشنهادی)

1. **تست واقعی در مرورگر (ضروری):** `npm install && npm run build && npm start` لوکال یا روی هاست؛ همه‌ی ۲۸ مورد + مودال‌ها (باز/بسته شدن و چانک‌های lazy) + تغییر تم + چراغ WARNING زرد + حالت OPEN را دستی تست کنید.
2. **دیپلوی و GTmetrix دوباره** (از Frankfurt/Amsterdam نه Seattle): انتظار بهبود Performance از 54 به ~70+ (TBT 729→~300ms، حذف lazy LCP). TTFB/Cache از قبل خوب است.
3. در صورت باقی‌ماندن TBT بالا: بررسی `recharts` در Management App نیست؛ در سایت اصلی، بزرگ‌ترین چانک‌های lazy (`AdminPanelTab` 163KB، `CsharpCodeViewer` 95KB، `ThemeSelectorModal` 135KB) فقط با کلیک بار می‌شوند — اگر در تست دیدید روی تب admin کند است، اسپلیت بیشتر لازم است.
4. `flutter_app`: حتماً `flutter pub get && flutter analyze && flutter run` تست شود (تغییرات Dart در جلسات قبلی کامپایل نشده‌اند).

---

## ۶. نکات فنی مهم برای ادامه‌ی کار

- **در این sandbox:** `node_modules` را می‌توان با `npm install --ignore-scripts` نصب کرد (فقط تایپ‌چک/بیلد فرانت)؛ بیلد native بهتر-sqlite3 **نمی‌شود**. برای تایپ‌چک: `./node_modules/.bin/tsc --noEmit` (ریشه و `Management App/Bazino` هر دو).
- بیلد فرانت: `npx vite build` (ریشه) و `cd 'Management App/Bazino' && npm run build`.
- کاربر فارسی‌زبان است و با جزئیات فنی دقیق و صادقانه پاسخ می‌گیرد؛ اگه چیزی رو نمی‌تونی تست کنی، صادقانه بگو.
- فایل‌های وضعیت (`ARCHITECTURE.md`, `ISSUES_FOUND.md`, `SESSION_SUMMARY.md`) رو بعد از هر batch به‌روزرسانی کن.
- در پایان هر batch، پروژه رو zip کن و به کاربر بده — کاربر همیشه فایل نهایی زیپ‌شده می‌خواد.
- Management App آدرس API هاردکد ندارد؛ همه‌ی fetchها relative هستند و در حالت co-located کنار سرور سایت سرو می‌شود (حالت standalone برای دسکتاپ از Web Sync استفاده می‌کند).
