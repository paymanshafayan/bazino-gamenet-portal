# SKILL: Verify & Build (بررسی سلامت و بیلد)

## هدف
اطمینان از اینکه پروژه بعد از هر تغییر، تایپچک، تست قالبها و بیلد سالمی
دارد — قبل از commit/push.

## زمان استفاده
- قبل از هر commit بزرگ
- بعد از تغییر در `src/`, `server.ts`, `server/`, `flutter_app/src/`

## مراحل

### ۱. تایپچک TypeScript (ریشه)
```bash
npm run lint          # = tsc --noEmit
```

### ۲. تست موتور قالب
```bash
npx tsx scripts/verify-themes.ts
# انتظار: «ALL THEME ENGINE CHECKS PASSED»
```

### ۳. بیلد فرانتاند
```bash
rm -rf dist && npx vite build
```
باندل اصلی باید تقریباً `~345 kB (gzip ~110 kB)` باشد (کد اسپلیتینگ فعال).
چانکهای lazy برای AdminPanelTab/ThemeSelectorModal/... جدا دیده شوند.

### ۴. بررسی تصاویر خروجی
```bash
ls dist/assets/ | grep -iE "logo|background"
# انتظار: bazino_logo_user-*.webp (15 kB) و background-*.jpg (18 kB)
```

### ۵. بوت production (اختیاری ولی توصیهشده)
```bash
PORT=3399 npx tsx server.ts   # در background
curl -s http://localhost:3399/api/data-source
# انتظار: {"mode":"sample",...} — سپس سرور را متوقف کن
```
> در sandbox، `better-sqlite3` ممکن است بایندینگ native نداشته باشد:
> ```bash
> cd node_modules/better-sqlite3 && npm_config_nodedir=/usr/local npx node-gyp rebuild --release
> ```

## معیار موفقیت
- `npm run lint` → ۰ خطا
- `verify-themes.ts` → ALL PASSED
- `vite build` → بدون خطا، باندل اصلی ~345 kB
- (در صورت بوت) `curl /api/data-source` جواب JSON میدهد

## نکتهها
- `node_modules` در sandbox هر بار recycle میشود؛ بعد از `npm install
  --ignore-scripts` حتماً better-sqlite3 را rebuild کن (مرحله ۵).
- درخت git باید بعد از کار پاک باشد: `git status --short` فقط فایلهای
  عمدی را نشان دهد.
