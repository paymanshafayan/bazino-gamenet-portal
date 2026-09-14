# Bazino Admin — اپ فلاتر پنل مدیریت

کلاینت بومی (اندروید + iOS) پنل ادمین پرتال بازینو — تمام امکانات کنترل‌پنل وب به‌جز بخش‌های امنیتی (دستور ۲۰۲۶-۰۹-۱۲).

## گیتِ ورود (الزام اصلی)

بدون ورود موفق با حساب **admin**، هیچ صفحه‌ای جز صفحهٔ لاگین رندر نمی‌شود:

- تنها نقطهٔ ورود اپ `AuthGate` است (هیچ route نام‌گذاری‌شده‌ای وجود ندارد — deep-link ممکن نیست).
- توکن JWT پس از لاگین نگه داشته می‌شود؛ هر پاسخ **401** از هر API → خروج خودکار فوری به صفحهٔ لاگین.
- در بوت اپ، توکن ذخیره‌شده با سرور تأیید می‌شود؛ نامعتبر بودن → صفحهٔ لاگین.
- حساب با `role != admin` رد می‌شود (`adminOnlyError`).
- تست‌پوشی: `test/widget_test.dart` دقیقاً همین رفتارها را assert می‌کند.

## بخش‌ها (۲۳)

داشبورد، جارویس (چت/گفتگوها/تأییدها)، سیستم‌ها (+ نمای سالن)، کافه (+ سفارش‌ها)، فروشگاه (+ سفارش‌ها)، مسابقات، عملیات مسابقات، بلاگ، تخفیف‌ها (کوپن/ساعات ویژه)، محتوا، اتاق‌های چت، دیتابیس، پیام‌ها، قالب‌ها (**نصب ZIP با خط‌لولهٔ 202 + polling job** — همان قرارداد ۲۰۲۶-۰۹-۱۲)، اسلایدر اپ، اپ موبایل (Appetize/APK/لینک‌ها)، شخصی‌سازی، لاگ دیتابیس، پرزنتیشن، تیکت‌ها، کیف پول (شارژ/برداشت/تسویه حضوری/credits)، همکاران (برنامه/گزارش/تنظیمات/اینستاگرام)، پیام‌رسانی (کمپین SMS/Viber).

### حذف‌شده‌های امنیتی (عمداً — فقط از پنل وب مدیریت می‌شوند)
- کلیدهای API / توکن‌های دسترسی `baz_` (apiKeys)
- پیکربندی کلیدهای سرویس‌های AI جارویس
- سکرت‌های کانال‌های پیام‌رسانی (messaging config)
- Web Sync shared secret

## معماری

```
lib/
  main.dart            → AuthGate (تنها ورود) + تم دارک/طلایی + fa-RTL/en
  auth/                → AuthController (نشست + verify در بوت) + LoginScreen
  core/
    api_client.dart    → HTTP واحد: JWT، هندل 401→لاگ‌اوت، خطای محلی‌شده، آپلود باینری
    l10n.dart          → fa/en (فارسی پیش‌فرض، RTL)
    prefs.dart         → آدرس سرور/توکن/زبان
    format.dart        → پول (₺)/تعداد/بایت/تاریخ
  shell/home_shell.dart→ کشوی بخش‌ها (موبایل) / ریل (تبلت) + رجیستری بخش‌ها
  widgets/crud.dart    → فریم‌ورک CRUD config-driven (فرم + لیست + حذف/ویرایش)
  sections/            → ۲۳ بخش
```

- **قرارداد API**: همهٔ مسیرها/شکل‌های پاسخ از سرور واقعی پرتال برداشت شده‌اند → `api_contract.json` (تولیدشده با `tool/capture_contract.cjs` روی `dist/server.cjs`). هیچ API جدیدی به سرور اضافه نشده.
- **احراز هویت**: `POST /api/auth/login` → JWT؛ همان توکن برای مسیرهای `/api/admin/*` (middleware سراسری سرور) و `/api/management/*` (guard staff) — admin = staff با همهٔ مجوزها.
- **زبان**: فارسی (پیش‌فرض، RTL) و انگلیسی — سوییچ زنده از نوار عنوان.

## اجرا

```bash
cd admin_app
flutter pub get
flutter run           # اندروید/iOS
flutter test          # تست‌های ویجت
flutter build apk --release
flutter build ipa --release
```

اولین اجرا: آدرس سرور (مثل `https://bazino.pro`) + حساب ادمین.

## CI

`.github/workflows/flutter-test.yml` — ورک‌فلوی واحد همهٔ اپ‌های فلاتر ریپو (کشف خودکار هر پوشهٔ سطح‌یک با `pubspec.yaml`؛ اپ جدید فقط با اضافه‌شدن پوشه‌اش وارد می‌شود). روی هر push به `admin_app/**` برای این اپ:
`flutter pub get` → `flutter analyze` → `flutter test` → `flutter build web` → `flutter build apk` + artifactهای وب/APK + **پوش APK به امولاتور Appetize** (با سکرت `APPETIZE_TOKEN`؛ ریلیز چرخشی `admin_app-latest` و publicKey پین‌شده در `admin_app/.appetize.json`) + گزارش `FLUTTER_CI_REPORT-admin_app.md` که خودکار روی برنچ کامیت می‌شود.
