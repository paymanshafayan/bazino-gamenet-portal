# نصب و چک خودکار نرم‌افزار مدیریت گیم‌نت در سندباکس (خودتست دسکتاپ)

این سند «راه‌کار» نصب و راستی‌آزمایی **همان نرم‌افزار دسکتاپ** داخل محیط ایجنت است —
بدون نیاز به ویندوز/ماشین واقعی. هر جلسه‌ای می‌تواند با ۳ دستور کل نرم‌افزار را از صفر
نصب کرده و به‌صورت خودکار چک کند.

## چرا Electron واقعی اجرا نمی‌شود؟

باینری Electron از GitHub Releases می‌آید و CDN آن (`release-assets.githubusercontent.com`
/ `objects.githubusercontent.com`) و میرورها (npmmirror) در سندباکس بسته‌اند؛ فقط
`registry.npmjs.org` باز است. همچنین rebuild ماژول native (`better-sqlite3`) برای ABI
الکترون هم به همان CDN نیاز دارد.

**جایگزین معادل:** پروسهٔ `main.js` الکترون کاری جز این‌ها ندارد: chdir به پوشهٔ
دادهٔ کاربر (`app.getPath('userData')`)، ست‌کردن `BAZINO_STATIC_ROOT`، تولید و ماندگار
کردن `JWT_SECRET`، و `require()` کردن همان `server-bundle/dist/server.cjs` درون‌پردازه.
این دقیقاً همان کاری است که `desktop-app/scripts/run-headless-desktop.cjs` انجام می‌دهد؛
و پنجرهٔ اپ هم با Chromium واقعی (`@sparticuz/chromium` — باینری از خود npm) در همان
ابعاد پنجرهٔ main.js (۱۴۴۰×۹۰۰) باز می‌شود. یعنی: **همان باندل نصبی، همان سرور
in-process، همان UI — فقط بدون WM/X11.**

## مراحل (از صفر)

```bash
# ۰) وابستگی‌های مرورگر (یک بار؛ بعد از ریبیلد سندباکس دوباره لازم می‌شود)
cd /home/user/shot-browser && npm i puppeteer-core @sparticuz/chromium

# ۱) بیلد بک‌اند (سایت و اپ مدیریت از قبل بیلد شده‌اند؛ این فقط server.cjs را تازه می‌کند)
cd /home/user/bazino-gamenet-portal
npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external \
  --sourcemap --outfile=dist/server.cjs

# ۲) آماده‌سازی باندل نصبی دسکتاپ (فقط وابستگی‌های production + کپی بیلدها)
#    nodedir لازم است چون prebuild های better-sqlite3 از CDN بستهٔ گیت‌هاب می‌آیند.
cd desktop-app
npm_config_nodedir=/usr/local node scripts/prepare-server-bundle.js

# ۳) اجرای پروسهٔ main (مدیریت‌شده) + چک خودکار ۲۹گانه
cd ..
node cdp-tools/check-desktop-app.cjs
```

اسکریپت چک اگر سرورِ پورت `BAZINO_DESKTOP_PORT` (پیش‌فرض 3100) بالا نباشد، خودش
`run-headless-desktop.cjs` را بالا می‌آورد و آخر کار می‌بندد؛ اگر از قبل بالا باشد، به
همان وصل می‌شود و آن را زنده نگه می‌دارد (برای پیش‌نمایش زندهٔ کارفرما).

## چه چیزی چک می‌شود؟ (۲۹ چک)

- اولین اجرا: ساخت دیتابیس SQLite تازه + ادمین پیش‌فرض `admin/admin` + ویزارد دادهٔ نمونه
- ورود امن اپ مدیریت (ops gate)
- تب‌های اپ + تب جارویس
- مودال «همگام وب»: وضعیت اتصال، رزروها، قالب‌ها (لیست دیتابیس محلی + نصب ZIP)،
  **تیکت‌ها (لیست + پاسخ واقعی از UI)**، پیام‌ها، گفتگوی زنده، پیامک گروهی (مساجیو)،
  **تنظیمات سایت (ویرایش + ذخیرهٔ واقعی از UI و راستی‌آزمایی از API)**، اسلایدر،
  لاگ‌ها + لاگ دیتابیس، کلید API + توکن‌های اتصال، مستندات JSON
- سایت عمومی هم توسط همان سرور داخلی سرو می‌شود
- صفر خطای جاوااسکریپت در کل مسیر

خروجی: `PASS/FAIL` هر چک + کد خروج (0/1) + اسکرین‌شات‌ها در `cdp-tools/shots/desktop-*.png`.

## داده‌های تست (مثل اپراتور واقعی)

قبل از چک‌های UI، این داده‌ها از طریق API ساخته می‌شوند: کاربر تست، تیکت فنی
«گیردستی PS5»، پیام جمعی «شب‌بازی جمعه»، دادهٔ نمونه (reset-database) و کلید sync
محلی `desktop-local-key-1`.

## پیش‌نمایش زنده برای کارفرما

اگر instance را با `start_process` بالا نگه دارید (پورت 3100 روی 0.0.0.0)، کارفرما
می‌تواند از پنل پیش‌نمایش، نسخهٔ نصب‌شده را مثل اپ واقعی باز کند:
`/management-app/` — ورود با `admin/admin`.

## نکته‌های محیطی

- ریبیلد سندباکس این‌ها را پاک می‌کند: `node_modules` (ریشه و shot-browser)،
  `desktop-app/server-bundle`، `/tmp/al2023*`. مراحل ۰ تا ۳ را دوباره اجرا کنید.
- دیتای اپ نصب‌شده در `~/.bazino-desktop-sim/` است (SQLite + `.jwt-secret`) و
  بین ری‌استارت‌ها می‌ماند؛ برای «اولین اجرای تمیز» آن پوشه را پاک کنید.
- apt در سندباکس کار نمی‌کند؛ کتابخانه‌های لازم Chromium از خود باندل
  `@sparticuz/chromium` می‌آیند (`LD_LIBRARY_PATH=/tmp/al2023/lib` — داخل اسکریپت هندل شده).
