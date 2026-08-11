# SKILL: GTmetrix / Performance Fixes (رفع مشکلات عملکرد)

## هدف
بررسی و رفع موارد عملکردی که GTmetrix/PageSpeed گزارش میدهند (باندل،
تصاویر، فونتها، lazy loading، کش) — در نسخهی وب و mirror به flutter_app.

## زمان استفاده
- بعد از دریافت گزارش GTmetrix/PageSpeed جدید
- بعد از هر تغییری که باندل/تصاویر را سنگین میکند

## چکلیست رفع (با معادل کد)

| مشکل GTmetrix | راهحل در کد |
|---|---|
| باندل JS بزرگ | کد اسپلیتینگ: `lazy(() => import(...))` + `Suspense` در `App.tsx` — فقط HomeTab eager |
| تصاویر PNG حجیم | WebP/JPG: لوگو → `bazino_logo_user.webp` (15 kB)، پسزمینه → `background.jpg` (18 kB) |
| فونت با `@import` | حذف `@import url(fonts...)` از `src/index.css` + `<link>` با `display=swap` و `preconnect` در `index.html` |
| تصاویر بدون lazy | `loading="lazy"` روی همهی img بهجز hero فعال؛ hero: `loading={active ? 'eager' : 'lazy'}` + `fetchpriority` |
| بدون ابعاد تصویر | `width`/`height` روی img لوگو |
| کش ضعیف | `express.static` با `setHeaders` → `Cache-Control: public, max-age=31536000, immutable` برای `/assets/` |

## مراحل
1. تغییرات را در ریشه اعمال کن (فایلهای `index.html`, `src/index.css`,
   `src/App.tsx`, `src/components/*`, `server.ts`, `public/`, `src/assets/images/`).
2. `skills/verify-and-build/SKILL.md` را اجرا کن (lint + build + بررسی باندل).
3. اگر تغییر به فرانتاند/سرور/تصاویر مربوط بود، به flutter_app هم mirror کن
   (SKILL: `mirror-web-to-flutter`).
4. باندل را با baseline مقایسه کن:
   - baseline قبلی (بدون فیکس): 2.08 MB کل، JS 249 kB
   - بعد از فیکس: JS اصلی ~345 kB (gzip ~110 kB)، لوگو 15 kB، پسزمینه 18 kB

## معیار موفقیت
- `grep -c "@import url('https://fonts" src/index.css` → ۰
- `grep -c "loading=" src/components/HomeTab.tsx` → فقط hero شرطی + بقیه lazy
- build: باندل اصلی زیر ~400 kB
- موارد باقیمانده فقط «host config» باشند (TTFB, ریدایرکت, beacon سرویس خارجی)

## نکتهها
- موارد «غیرقابل رفع در کد» (TTFB، ریدایرکت 307، Cloudflare beacon،
  DOM بیش از حد) را در گزارش بهعنوان host-level ثبت کن — در کد دست نزن.
- پس از هر تغییر، `SESSION_SUMMARY.md` و `ARCHITECTURE.md` را بهروز کن.
