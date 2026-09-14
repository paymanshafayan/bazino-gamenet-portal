# Headless Chromium Toolkit — اسکرین‌شات و عیب‌یابی قالب روی سرور dev

مرورگر headless بدون نیاز به اینترنت (باینری داخل پکیج npm):
`@sparticuz/chromium` کرومیوم لامبدایی را همراه خود دارد و روی دبیان با
کتابخانه‌های استخراج‌شده از `al2023.tar.br` اجرا می‌شود.

## نصب (بعد از هر ریبیلد سندباکس)
```bash
mkdir -p /home/user/shot-browser && cd /home/user/shot-browser
npm init -y >/dev/null && npm install @sparticuz/chromium puppeteer-core
cp <repo>/cdp-tools/browser-tools/*.mjs <repo>/cdp-tools/browser-tools/*.cjs .
```

## اجرا (سرور پرتال باید روی :3000 بالا باشد)
```bash
LD_LIBRARY_PATH=/tmp/al2023/lib FONTCONFIG_PATH=/tmp/fonts \
  node shot.mjs      # اسکرین‌شات دسکتاپ+موبایل + گزارش JSON کامل (regions/کنسول/شبکه)
  node debug.mjs     # استک کامل خطاها + وضعیت رجیستری SDK
  node trace.cjs     # لاگ زمانی ثبت قالب/MutationObserver روی نواحی
  node vercheck.cjs  # بررسی نسخه‌های ?v= وابستگی‌های Vite در صفحه
```

## یادداشت باگ ۲۰۲۶-۰۹-۱۱ (صفحهٔ خالی قالب ZIP در dev)
- علامت: مناطق home/footer/mobileNav بعد از ثبت قالب خالی می‌مانند؛ کنسول:
  «Hook can only be invoked from render methods» از preact_debug تزریقی.
- ریشه: تزریق `preact/devtools` توسط @preact/preset-vite در dev + شکست زنجیرهٔ
  options.__r/__h با optimizeDeps چند-ورودی.
- فیکس: `preact({ devToolsEnabled: false })` در vite.config.ts + batchNotify در
  src/themeSdk/sdk.ts (ادغام notifyهای یک تیک در یک میکروتسک).
- ابزار تشخیصی همین پوشه؛ snapshot ایستا هم با run-boot.mts در build/.
