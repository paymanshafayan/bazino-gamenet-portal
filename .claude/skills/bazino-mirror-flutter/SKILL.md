---
name: bazino-mirror-flutter
description: Mirror web frontend/server changes from the repo root into the flutter_app/ copy (index.html, index.css, App.tsx, components, server.ts cache headers, images). Includes stale-PNG cleanup, reference updates (bg.png→bg.jpg), and build verification of the copy. Use after any shared-file change.
metadata:
  author: bazino
  version: "1.0.0"
---

# bazino-mirror-flutter

## هدف
`flutter_app/` یک کپی کامل از پروژهی وب (React + server) بههمراه اپ
Flutter واقعی است. تغییرات فرانتاند/سرور ریشه باید به کپی داخل
`flutter_app/` هم اعمال شوند تا هر دو نسخه همگام بمانند.

## زمان استفاده
بعد از هر تغییری در فایلهای مشترک: `index.html`, `src/index.css`,
`src/App.tsx`, `src/components/*`, `server.ts`, `src/assets/images/`,
`public/`.

## مراحل

### ۱. مقایسه و شناسایی فایلهای متفاوت
```bash
diff -rq src flutter_app/src 2>/dev/null | head -30
diff -q index.html flutter_app/index.html
diff -q server.ts flutter_app/server.ts
```

### ۲. mirror فایلهای «یکسان باید باشند»
```bash
cp index.html flutter_app/index.html
cp src/assets/images/bazino_logo_user.webp flutter_app/src/assets/images/
cp src/assets/images/background.jpg flutter_app/src/assets/images/
cp public/logo.png flutter_app/public/logo.png
cp public/bg.jpg flutter_app/public/bg.jpg
```
> `src/App.tsx` و کامپوننتها را **نسخه به نسخه** کپی نکن — flutter_app
> ممکن است موتور قالب (`src/themes/`, `src/themeSdk/`) را نداشته باشد.
> تغییرات مشترک (lazy/Suspense, لوگو, width/height) را دستی اعمال کن.

### ۳. پاکسازی فایلهای قدیمی حذفشده
```bash
rm -f flutter_app/src/assets/images/background.png flutter_app/src/assets/images/bg.png
rm -f flutter_app/public/bg.png
```

### ۴. اصلاح ارجاعها در کپی
- `flutter_app/src/index.css`: مسیر پسزمینه `background.png` → `background.jpg`
- `flutter_app/src/components/ConsoleHubView.tsx`: `url('/bg.png')` → `url('/bg.jpg')`
- حذف import های مرده (مثل `backgroundBg`) از `flutter_app/src/App.tsx`

### ۵. بررسی نهایی همگامی
```bash
diff index.html flutter_app/index.html          # باید یکسان باشد
grep -rn "bg\.png\|background\.png" flutter_app/src --include="*.tsx" --include="*.ts" --include="*.css"
# خروجی باید خالی باشد
```

### ۶. بیلد تست کپی
```bash
cd flutter_app && npm install --ignore-scripts && npx tsc --noEmit && rm -rf dist && npx vite build
```

## معیار موفقیت
- `diff index.html flutter_app/index.html` → بدون تفاوت
- بدون هیچ ارجاع `*.png` قدیمی در `flutter_app/src`
- build flutter_app موفق با باندل اصلی ~355 kB

## نکتهها
- اسناد (README/ARCHITECTURE/...) ریشه را میتوان مستقیم کپی کرد، ولی
  بررسی کن که flutter_app نسخهی قدیمیتر نداشته باشد.
- فایلهای Flutter واقعی (`lib/`, `pubspec.yaml`, پلتفرمها) فقط یکجا
  وجود دارند — هرگز از ریشه کپی نکن.
