# محل قرارگیری نصاب‌های واقعی دسکتاپ

`server.ts` (مسیرهای `/api/desktop/download/:platform` و `/api/desktop/availability`) این پوشه رو برای فایل‌های نصاب واقعی چک می‌کنه. بعد از build گرفتن واقعی (طبق `desktop-app/README.md`)، خروجی‌ها رو اینجا کپی کنید:

```
desktop-builds/
  windows/   <- فایل .exe (از desktop-app/release/ بعد از "npm run dist:win")
  mac/       <- فایل .dmg (بعد از "npm run dist:mac")
  linux/     <- فایل .AppImage (بعد از "npm run dist:linux")
```

هر پوشه فقط باید شامل یک فایل نصاب باشه (اگه چندتا بود، اولین‌شون به ترتیب الفبا سرو می‌شه). تا وقتی پوشه‌ای خالی/غایب باشه، دکمه‌ی دانلود مربوطه در تنظیمات Management App به‌صورت غیرفعال («به‌زودی») نشون داده می‌شه — نه لینک خراب.

این پوشه‌ها عمداً در `.gitignore` نیستن که بعد از build واقعی، خودتون تصمیم بگیرید commit کنید یا نه (فایل‌های نصاب معمولاً حجیم‌ان — شاید ترجیح بدید به‌جاش از GitHub Releases یا CDN استفاده کنید و این route ها رو به اونجا redirect کنید).
