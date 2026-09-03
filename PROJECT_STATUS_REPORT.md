# گزارش وضعیت پروژه — BAZINO PRO (بازینو پرو)

> تهیه‌شده بر اساس بررسی اسناد و کد مخزن `paymanshafayan/bazino-gamenet-portal`
> برنچ کاری: `arena/01a05e95-bazino-gamenet-portal` (برابر با HEAD اصلی: `df87a7a`)
> تاریخ گزارش: ۲۰۲۶-۰۹-۰۱

---

## ۱. خلاصه‌ی اجرایی

**BAZINO PRO** یک پلتفرم جامع مدیریت کلوپ گیمینگ (گیم‌نت) است که چهار بخش جداگانه را در یک مخزن نگه می‌دارد:

| بخش | مسیر | فناوری | نقش |
|---|---|---|---|
| سایت / اپ مشتری | ریشه‌ی پروژه (`src/`, `server.ts`) | React 19 + Preact/ Vite + Express (Node.js) | رزرو، کافه، فروشگاه، تورنومنت، بلاگ، لویالتی، چت زنده |
| اپ مدیریت داخلی | `Management App/Bazino` | React + Vite + Recharts | صندوق/مدیریت ایستگاه‌ها، بوفه، مشتریان، حسابداری، اپراتورها |
| اپ موبایل | `flutter_app` | Flutter (Android/iOS/Web/Desktop) | کلاینت موبایل متصل به بک‌اند واقعی |
| دسکتاپ مستقل | `desktop-app` | Electron | نسخه‌ی قابل‌نصب مدیریت، با بک‌اند محلی + sync آنلاین |
| فیچر «تولید کد» | `src/data/csharpCode.ts` و ... | مستندسازی/نمایشی | نمایش کد معادل C# / Flutter برای کاربر |

بک‌اند رسمی و تنها بک‌اند production: **Node.js / Express** (`server.ts`).

---

## ۲. وضعیت مخزن و گیت

- **ریشه‌ی برنچ کاری:** `arena/01a05e95-bazino-gamenet-portal`
- **نقطه‌ی شروع:** commit `df87a7a` (Merge PR #14 به `main`)
- **وضعیت working tree:** تمیز (بدون تغییر commit‌نشده)
- **تعداد فایل‌های غیر از git/node_modules:** ۴۳۱ فایل
- **حجم کل مخزن (بدون git):** ~۲۸ مگابایت
- **آخرین فعالیت GitHub (PRهای merge شده):** ۱۴ PR؛ آخرین PR (#14) مربوط به ۲۰۲۶-۰۸-۱۴ درباره‌ی آپلود chunked APK است.
- **فایل‌های CI/CD موجود:**
  - `.github/workflows/build-test.yml` — تایپ‌چک + تست قالب‌ها + بیلد فرانت/بک + بوت و smoke تست
  - `.github/workflows/deploy.yml` — بیلد + دیپلوی Railway + پاک‌سازی کش Cloudflare/ArvanCloud
  - `.github/workflows/main.yml` — بیلد APK اندروید + آپلود Appetize + بیلد iOS

---

## ۳. اسناد موجود در مخزن

| سند | وضعیت / موضوع |
|---|---|
| `README.md` | معرفی، امکانات، اجرای محلی، اسکریپت‌ها، تست‌ها، ساختار — به‌روز |
| `ARCHITECTURE.md` | معماری جامع + تصمیمات کلیدی + مدل داده + طراحی UI + چک‌لیست وضعیت — به‌روز |
| `HANDOFF_CONTINUE_HERE.md` | سند انتقال کامل برای نشست جدید — آخرین نسخه با وضعیت ۲۸ مورد ✅ |
| `SESSION_SUMMARY.md` | خلاصه‌ی جلسات (۴۳ بخش) — بسیار کامل، آخرین به‌روزرسانی: پاک‌سازی ۴۳ |
| `ISSUES_FOUND.md` | لیست مشکلات اولیه + جدول وضعیت رفع — به‌روز |
| `PUBLISHING_GUIDE.md` / `PUBLISH_AND_DATABASE_GUIDE.md` | راهنمای انتشار و دیتابیس |
| `CLOUD_BUILD_GUIDE.md` | راهنمای بیلد ابری Flutter (Codemagic / GitHub Actions) |
| `LOCAL_IMAGES_PLAN.md` | طرح لوکال‌سازی تصاویر — وضعیت DONE |
| `REFERENCE_IMAGE_INFO.md` | رجیستر طراحی مرجع (لایوت HUD/Dashboard) |
| `BAZINO_PRO_Presentation.*` / Mobile | فایل‌های ارائه (HTML + PDF، ~۷MB) |
| `src/themes/README.md` | راهنمای کامل موتور قالب‌بندی (ZIP + assets + SDK) |
| `tests/README.md` | راهنمای تست‌ها |
| `ci/README.md` | راهنمای فعال‌سازی CI |
| `flutter_app/{README,HANDOFF,LOCAL_RUN_HANDOFF,REDESIGN_NOTES}.md` | مستندات اختصاصی Flutter |
| `desktop-app/README.md` | راهنمای دسکتاپ Electron (با اخطار «تست‌نشده روی sandbox») |

---

## ۴. وضعیت تکمیل فیچرها

### ۴.۱ چک‌لیست ۲۸ موردی GameCenter (اپ مدیریت)
طبق `HANDOFF_CONTINUE_HERE.md` و `SESSION_SUMMARY.md`، **هر ۲۸ مورد تکمیل شده است ✅**، از جمله:
- مدت بازی بر اساس مبلغ پرداختی، صدای هشدار + تکرار/تغییر صدا، چراغ‌های هشدار
- تعرفه‌ی ساعات خاص روز، خدمات ویژه، تغییر تعرفه حین بازی، جابه‌جایی صورتحساب، OPEN/بستن تایم
- حسابداری و سود بوفه، ثبت هزینه‌ها، نمودار ستونی ماهانه، مقایسه دو ماه
- ۲۰ تم گرافیکی واقعی (CSS variables)، کیف پول/شارژ، رده‌بندی و تخفیف ساعتی، تخفیف تولد
- پرداخت قبل/بعد، رند کردن، تفکیک نقد/کارتخوان، بدهکاری/بستانکاری
- پشتیبان‌گیری خودکار روزانه، ساعت کارکرد ایستگاه (ریست روزانه)، حفظ اطلاعات هنگام قطع برق (`/api/state`)
- محدودیت دسترسی اپراتور

### ۴.۲ سایت/بک‌اند (ریشه)
- **~۱۰۰ endpoint** در `server.ts` (GET/POST/PUT/DELETE/PATCH)
- احراز هویت JWT واقعی per-user، هش bcrypt
- سه provider دیتابیس واقعی: SQLite (`better-sqlite3`)، SQL Server (`mssql`)، MongoDB (`mongodb`)
- محاسبه‌ی سرور-محور قیمت/امتیاز/تخفیف + چک هم‌پوشانی رزرو (رفع اعتماد به کلاینت)
- چت real-time WebSocket، لویالتی، کد تخفیف با انقضا/سقف استفاده
- موتور قالب‌بندی جدید: قالب‌های CSS مجزا + نصب ZIP + assets + SDK (`theme.js`) + `themeStore`
- سوییچ منبع داده «نمونه ⇄ دیتابیس» از پنل ادمین
- قانون لوگوی سایت مادر `/logo.png` + `brand-logo-guard`، حذف برندینگ Google AI Studio
- ۴ زبان (فارسی، انگلیسی، ترکی، روسی)، قانون طراحی «بدون رنگ بنفش»
- بهینه‌سازی عملکرد: کد اسپلیتینگ، vendor splitting، inline CSS، تصاویر WebP لوکال، preconnect، lazy modalها، fetchهای غیربحرانی با `requestIdleCallback`

### ۴.۳ اپ مدیریت (Management App)
- React + Vite + Recharts، بیلد مستقل (`dist/`) و سرو در `/management-app`
- تایپ‌چک و بیلد پاک (پس از افزودن `@types/react` و رفع ۲ خطای `nextStatus`)
- اتصال Web Sync به سرور سایت (رزروهای آنلاین / گزارش وضعیت ایستگاه‌ها)

### ۴.۴ اپ موبایل (Flutter)
- پروژه‌ی مستقل واقعی: `lib/` + پلتفرم‌ها + `pubspec.yaml` (`name: bazino_app`)
- اتصال به بک‌اند: لاگین JWT، چت WebSocket، رزرو/سفارش/تورنومنت، دستیار «جارویس»
- آدرس API: `https://bazino.pro` (در `api_config.dart`)
- ری‌دیزاین Neon Glass، رفع دسته‌ای خطاها/لینت‌های Dart
- ورک‌فلو CI برای بیلد APK و iOS در `.github/workflows/main.yml`

### ۴.۵ دسکتاپ (Electron)
- پنجره‌ی Electron شامل بک‌اند `server.cjs` + SQLite محلی + صفحه‌ی `/management-app`
- قابلیت اتصال به سرور آنلاین (Web Sync) با API Key
- **هشدار مهم:** مستند می‌کند که این بخش در sandbox **اجرا/تست نشده** و پیش از تحویل باید روی ماشین واقعی تست شود.

---

## ۵. وضعیت امنیت و کیفیت کد

| موضوع | وضعیت |
|---|---|
| پسورد خام (plain text) | ✅ برطرف شد — bcrypt |
| ادمین پیش‌فرض ضعیف (`admin/admin`) | ✅ برطرف شد — فقط fallback dev |
| اعتماد به قیمت/امتیاز/تخفیف کلاینت | ✅ برطرف شد — محاسبه‌ی سرور-محور |
| اعتبارسنجی ناقص کد تخفیف | ✅ برطرف شد — انقضای واقعی + سقف استفاده |
| سوییچ دیتابیس نمایشی/فیک | ✅ برطرف شد — هر سه provider واقعی |
| چک هم‌پوشانی رزرو (double-booking) | ✅ برطرف شد |
| وابستگی بلااستفاده `sqlite3` | ✅ حذف شد |
| تصاویر حجیم/بهینه‌نشده | ✅ بهینه شد (لوگو ۸۴۰KB→۱۵KB، پس‌زمینه ۳.۵MB→۱۸KB) |
| CORS باز (در WebAPI سابق) | ⏳ فقط هنگام انتشار عمومی WebAPI مطرح است |
| ابزارهای دمو داخل اپ اصلی | ⏳ عمداً نگه داشته شده (تب‌های کد/پرزنتیشن به‌صورت lazy) |
| `JWT_SECRET` در production | ⚠️ باید در محیط استقرار تنظیم شود (طبق README الزامی) |

---

## ۶. وضعیت عملکرد (بر اساس گزارش GTmetrix ۲۰۲۶-۰۸-۱۱)

| معیار | مقدار قبل | اقدام |
|---|---|---|
| Performance | 54% | هدف ~70+ بعد از بهینه‌سازی‌ها |
| Structure | 93% | ✅ |
| LCP | 2.0s | حذف lazy-load از heroها (`eager` + `fetchpriority=high` + عرض 1600) |
| TBT | 729ms | ❌ عامل اصلی — مودال‌های lazy شرطی، defer fetch غیربحرانی، vendor splitting (index 333KB→151KB)، انیمیشن‌های composited |
| CLS | 0.07 | ✅ |
| TTFB | 329ms | ✅ (پیکربندی هاست/Cloudflare باقی) |
| حجم | 1.19MB / 50 req | تصاویر لوکال WebP، حذف unsplash از runtime |

> **نکته:** بهبود نهایی باید بعد از دیپلوی روی `bazino.pro` و تست مجدد GTmetrix تأیید شود.

---

## ۷. CI/CD و استقرار

- **build-test.yml:** تایپ‌چک + تست قالب + بیلد فرانت + بوت backend + smoke تست APIها (روی push به main و PR).
- **deploy.yml:** `npm ci` + `npm run build` → دیپلوی Railway (با `@railway/cli@5.2.0`) → purge کش Cloudflare و/یا ArvanCloud.
- **main.yml:** بیلد APK (Android) + آپلود Appetize + بیلد iOS (macos).
- **دامنه‌ی فعلی:** `https://bazino.pro` (پشت Cloudflare). تاریخچه‌ی دامنه: `bazino.runasp.net` → `xerxes.biz` → `bazino.pro`.

---

## ۸. محدودیت‌ها / مواردی که TEST‌نشده باقی مانده‌اند

1. **تست واقعی مرورگر / بوت کامل سرور:** در sandbox نصب native `better-sqlite3`، Chrome/Chromium و Flutter SDK ممکن نیست؛ بنابراین بوت کامل و تست UI دستی انجام نشده.
2. **Flutter:** تغییرات Dart در جلسات قبلی کامپایل نشده‌اند؛ نیاز به `flutter pub get && flutter analyze && flutter run`.
3. **دسکتاپ Electron:** طبق README خود بخش، هیچ مرحله‌ای واقعاً اجرا/تست نشده و باید روی سیستم‌عامل مقصد تست شود (به‌خصوص ماژول‌های native و نصاب‌ها).
4. **بهینه‌سازی نهایی GTmetrix:** نیاز به دیپلوی و تست مجدد از Frankfurt/Amsterdam دارد.
5. **`GEMINI_API_KEY` / `APP_URL` / `JWT_SECRET`:** باید در محیط استقرار تنظیم شوند (فایل `.env.example` وجود دارد).

---

## ۹. اسنادی که نیاز به توجه/به‌روزرسانی دارند

- `flutter_app/README.md` — هنوز قالب پیش‌فرض Flutter است (اطلاعات اختصاصی پروژه در `HANDOFF.md`/`REDESIGN_NOTES.md`).
- `CLOUD_BUILD_GUIDE.md` — مثالی از ورک‌فلو Flutter داخل راهنما با APIهای قدیمی (`cleanup/upload-artifact@v3`) مغایر با ورک‌فلو واقعی (`.github/workflows/main.yml`) است.
- `ARCHITECTURE.md` در بخش «معرفی پروژه» هنوز به `server/GameNet.*` اشاره می‌کند؛ هرچند طبق `HANDOFF` این پوشه (و کپی‌های سراسری) حذف شده و در بخش‌های بعدی «پذیرفته‌شده به‌عنوان فیچر نمایشی» آمده — این بخش باید با وضعیت واقعی هماهنگ شود (کد C# صرفاً در `src/data/*` است).

---

## ۱۰. پیشنهاد برای ادامه‌ی کار (بر اساس اسناد)

1. **تست واقعی در مرورگر:** `npm install && npm run build && npm start` روی هاست؛ تست دستی ۲۸ مورد + مودال‌ها + تغییر تم + حالت OPEN/WARNING.
2. **تست Flutter:** `flutter pub get && flutter analyze && flutter run` (تغییرات Dart جلسات قبل کامپایل نشده‌اند).
3. **تست دسکتاپ Electron:** روی ویندوز/مک/لینوکس واقعی (Build + نصاب + native rebuild).
4. **دیپلوی و GTmetrix مجدد:** تأیید Performance حداقل ~70+، رفع احتمال TBT باقی‌مانده با اسپلیت بیشتر چانک‌های lazy بزرگ (`AdminPanelTab` 163KB، `CsharpCodeViewer` 95KB، `ThemeSelectorModal` 135KB).
5. **هماهنگ‌سازی اسناد:** اصلاح `ARCHITECTURE.md` (بخش GameNet) و به‌روزرسانی `README.md` فلاتر و راهنمای Cloud Build.
6. **امنیت استقرار:** ست کردن `JWT_SECRET` و کلیدهای env در Railway/هاست + تنظیمات کش و SSL Cloudflare.

---

*این گزارش از اسناد موجود (README، ARCHITECTURE، HANDOFF، SESSION_SUMMARY، ISSUES_FOUND، راهنماهای انتشار) و ساختار/کد مخزن استخراج شده است. هیچ تغییری در کد اعمال نشده است.*
