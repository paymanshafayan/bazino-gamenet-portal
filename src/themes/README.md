# 🎨 سیستم قالب‌بندی بازینو (Bazino Theme Engine)

این پوشه موتور قالب‌بندی جدید پروژه است که به سه هدف اصلی پاسخ می‌دهد:

1. **هر قالب تمام صفحات سایت را پوشش می‌دهد** (نه فقط صفحه اصلی)
2. **هر قالب فایل CSS مجزای خودش را دارد**
3. **تغییر قالب، ظاهر کامل تمام صفحات را عوض می‌کند**

---

## 📁 ساختار

```
src/themes/
├── index.ts            ← موتور قالب‌ها (ثبت، بارگذاری، تزریق، قالب سفارشی)
├── zip.ts              ← پکیج قالب با فرمت ZIP (پارس/ساخت/دانلود)
├── dark-gold.css       ← قالب پیش‌فرض طلایی
├── cyberpunk-cyan.css  ← سایبرپانک فیروزه‌ای
├── geco-purple.css     ← جکو بنفش
├── gaming-amp.css      ← گیمینگ AMP
├── console-grid.css    ← گرید کنسولی (کلاسیک)
├── gaming-hub.css      ← (legacy — دیگر قابل انتخاب نیست، فقط حفظ شده)
└── README.md
```

## 📦 نصب قالب با فایل ZIP (فرمت جدید)

در پنل مدیریت → «مدیریت قالب‌ها» → «نصب قالب جدید» → تب **نصب از فایل ZIP** می‌توانید
یک قالب را به‌صورت فایل `.zip` نصب کنید (و با «دانلود قالب نمونه» ساختار صحیح را ببینید).

### فایل‌های داخل پکیج ZIP

| فایل/پوشه | وضعیت | توضیح |
|---|---|---|
| `theme.css` | ✅ **اجباری** | استایل کامل قالب — همان فرمت فایل‌های `src/themes/*.css` |
| `theme.json` | ⬜ اختیاری | متادیتا (نام، شناسه، نسخه، توضیح، رنگ‌ها) |
| `assets/` | ⬜ اختیاری | **فایل‌های مورد نیاز قالب**: تصویر، ویدئو، فونت، آیکون و ... |
| `theme.js` | ⬜ اختیاری | **کامپوننت صفحه اصلی قالب** (با SDK — بخش «کامپوننت قالب» را ببینید) |

```
ساده‌ترین حالت (فقط CSS):        حالت کامل (پیشنهادی):
theme.zip                          theme.zip
└── theme.css                      ├── theme.json
                                   ├── theme.css
                                   ├── theme.js        ← کامپوننت صفحه اصلی (اختیاری)
                                   └── assets/
                                       ├── banner.jpg
                                       ├── logo.png
                                       └── intro.mp4
```

**یعنی کافی است ZIP فقط شامل فایل `theme.css` باشد؛ `theme.json` اختیاری است** و اگر نباشد،
این مقادیر به‌صورت خودکار استخراج می‌شوند:

| مقدار | منبع خودکار (وقتی theme.json نیست) |
|---|---|
| شناسه (id) | از `body[data-theme='...']` داخل CSS (یا اولین `.theme-...`) |
| نام (name) | از نام فایل ZIP (مثلاً `My Theme.zip` ← «My Theme») |
| رنگ‌ها (colors) | از متغیرهای CSS: `--primary-color`، `--dark-bg-color`، `--dark-card-color` |

```jsonc
// theme.json (اختیاری — اگر باشد این مقادیر در اولویت‌اند)
{
  "name": "Neon Storm",              // نام قالب (اختیاری — وگرنه از نام فایل ZIP)
  "id": "neon-storm",                // شناسه (اختیاری — وگرنه از CSS)
  "version": "1.0.0",                // نسخه (اختیاری)
  "description": "...",              // توضیح کوتاه (اختیاری)
  "colors": {                        // رنگ‌های پیش‌نمایش (اختیاری — وگرنه از CSS)
    "primary": "#00ff88",
    "bg": "#04070c",
    "card": "#0b1220"
  }
}
```

### فرمت فایل theme.css (اجباری)

CSS قالب باید «فرمت جدید» را داشته باشد تا تمام صفحات را پوشش دهد (الگو: `src/themes/dark-gold.css`):

```css
body[data-theme='neon-storm'] { --primary-color: #00ff88; --dark-bg-color: #04070c; /* ... */ }
.theme-neon-storm .site-header { /* ... */ }
.theme-neon-storm .bg-dark-card { /* ... */ }
.theme-neon-storm .btn { /* ... */ }
.theme-neon-storm input { /* ... */ }
/* ... */
```

**نکته‌ها:**
- شناسه قالب (id) به‌ترتیب از `body[data-theme='...']` در CSS، سپس فیلد `id` در `theme.json` و در آخر از نام فایل ساخته می‌شود.
- کامنت‌های CSS هنگام تشخیص شناسه/فرمت/رنگ‌ها نادیده گرفته می‌شوند.
- اگر فایل CSS با فرمت قدیمی باشد (بدون `body[data-theme]` و قوانین `.theme-...`) خطای «فرمت نامعتبر» نمایش داده می‌شود.
- مسیرهای ناامن داخل ZIP (مثل `../` برای خروج از پوشه) رد می‌شوند.

## 📁 پوشه اختصاصی هر قالب روی سرور

قالب‌هایی که از پنل ادمین نصب می‌شوند، روی سرور در **پوشه اختصاصی خودشان** ذخیره می‌شوند
(به‌جای localStorage — چون ممکن است به فایل‌های تصویر/ویدئو/فونت نیاز داشته باشند):

```
themes/<theme-id>/
├── theme.json        ← متادیتای نرمال‌شده
├── theme.css         ← استایل کامل قالب
└── assets/           ← فایل‌های مورد نیاز قالب (از ZIP استخراج شده)
    ├── banner.jpg
    └── ...
```

- **حذف قالب از پنل ادمین = حذف کامل همین پوشه** (همه فایل‌هایش)
- فایل‌ها از همین پوشه سرو می‌شوند:
  - `GET /api/themes/<id>/theme.css` ← فایل CSS (با بازنویسی مسیر assets)
  - `GET /api/themes/<id>/assets/<file>` ← هر فایل asset (تصویر/ویدئو/فونت/...)
  - `GET /api/themes/<id>/export` ← دانلود پکیج ZIP کامل قالب (شامل assets)
- آدرس‌دهی در CSS: به فایل‌های داخل `assets/` با **مسیر نسبی** اشاره کنید و هنگام سرو
  خودکار به آدرس واقعی تبدیل می‌شود:

```css
body[data-theme='neon-storm'] {
  background-image: url('assets/banner.jpg');   /* ← /api/themes/neon-storm/assets/banner.jpg */
}
@font-face {
  src: url('assets/my-font.woff2');
}
```

API های مدیریتی:
- `POST /api/admin/themes/install` (بدنه خام ZIP) ← نصب قالب در پوشه اختصاصی
- `DELETE /api/admin/themes/:id` ← حذف قالب + پوشه کامل
- `GET /api/themes` ← لیست قالب‌های نصب‌شده (`serverThemes` با cssUrl و assetFiles)

> پوشه `themes/` در `.gitignore` است — قالب‌های نصب‌شده هنگام اجرا ساخته می‌شوند و
> نباید در مخزن ذخیره شوند.

## 🏷 قانون لوگو — «حق انحصاری سایت مادر»

**لوگوی سایت متعلق به «سایت مادر» است و هیچ قالبی حق تغییر، جایگزینی، پوشاندن یا
مخفی‌کردن آن را ندارد.** لوگوی هدر اصلی (`<img class="brand-logo-guard">`) خارج از
کنترل قالب‌ها رندر می‌شود و با یک محافظ CSS تضمین شده است که هیچ قالبی (سیستمی یا
سفارشی) نتواند آن را مخفی یا تغییر دهد.

**آدرس استاندارد دریافت لوگو** (برای قالب‌هایی که در صفحه اختصاصی خود نیاز به نمایش لوگو دارند):

```
/logo.png
```

و معادل CSS آن (متغیر سراسری تعریف‌شده در `index.css`):

```css
:root { --brand-logo-url: url('/logo.png'); }

/* استفاده در قالب: */
.hero-logo { background-image: var(--brand-logo-url); }
```

این آدرس در هر دو حالت توسعه و تولید پایدار است (فایل در پوشه `public/` قرار دارد).

## 🧩 کامپوننت قالب (theme.js) — صفحه اصلی اختصاصی

قالب‌ها می‌توانند یک فایل **`theme.js`** (اختیاری) داشته باشند که یک کامپوننت صفحه
اصلی اختصاصی ثبت می‌کند — دقیقاً مثل قالب‌های سیستمی `GecoPurpleHome.tsx` و
`GamingAmpHome.tsx`. کامپوننت با **SDK** ثبت می‌شود و همان «قرارداد داده» (props)
قالب‌های سیستمی را دریافت می‌کند:

```js
/* theme.js — داخل پکیج ZIP */
(function () {
  var SDK = window.BazinoThemeSDK;
  if (!SDK) return; // SDK هنوز بارگذاری نشده → نادیده بگیر

  SDK.registerComponent('home', function () {
    return {
      apiVersion: 1,                       // نسخه قرارداد داده
      render: function (props) {
        var R = SDK.React;                 // React از SDK (بدون نیاز به باندل)
        return R.createElement('div', { className: 'my-theme-home' },
          R.createElement('h1', null, props.settings.clubName || 'BAZINO'),
          R.createElement('button', {
            onClick: function () { props.onNavigate('reservations'); }
          }, 'Reserve')
        );
      }
    };
  });
})();
```

**قرارداد داده (props) — نسخه 1** (همان داده‌ای که قالب‌های سیستمی می‌گیرند):

| prop | توضیح |
|---|---|
| `language`, `dir`, `t` | زبان فعلی (fa/en/ru/tr)، جهت (rtl/ltr)، تابع ترجمه |
| `onNavigate(tab)` | رفتن به تب (reservations, cafe, shop, tournaments, blog, loyalty, chat) |
| `featuredGames` | اسلایدهای اصلی (array با title/desc/imageUrl به‌صورت چندزبانه) |
| `gameGenres`, `matchHistory`, `pricingPackages`, `loungeSections`, `staffTeam` | بخش‌های محتوایی هوم |
| `tournaments` | تورنمنت‌های فعال |
| `settings` | تنظیمات کلوپ (club_name, club_phone, ...) |
| `logoUrl` | آدرس لوگوی سایت مادر (`/logo.png`) — **فقط برای نمایش** |
| `assetsBase` | آدرس پایه فایل‌های assets این قالب (مثل `/api/themes/<id>/assets`) |
| `themeId` | شناسه قالب |

**نکته‌ها:**
- برای ساخت `theme.js` باید کد خود را **از قبل باندل (compile) کنید**؛ React و آیکون‌ها
  از طریق `window.BazinoThemeSDK.React` در دسترس‌اند — آن‌ها را داخل bundle نگذارید.
- فایل `theme.js` از پوشه قالب سرو می‌شود: `GET /api/themes/<id>/theme.js`
- امنیت: `theme.js` کد اجرایی است — **فقط ادمین مورد اعتماد** باید قالب نصب کند
  (نصب از پنل مدیریت انجام می‌شود).
- اگر قالب `theme.js` نداشته باشد، صفحه اصلی پیش‌فرض اپ با استایل قالب نمایش داده می‌شود.

## 🏗 معماری

### ۱) فایل مجزا برای هر قالب
هر قالب در فایل `.css` خودش شامل دو بخش است:

- **متغیرهای رنگی**: `body[data-theme='<id>'] { --primary-color: ...; --dark-bg-color: ...; --theme-*: ... }`
- **استایل سراسری اسکوپ‌شده**: `.theme-<id> .site-header`، `.theme-<id> .bg-dark-card`،
  `.theme-<id> .btn`، `.theme-<id> input`، `.theme-<id> .rounded-*`، `::selection`، اسکرول‌بار و ...

چون کلاس `theme-<id>` روی ریشه‌ی اپلیکیشن (`<div class="theme-...">`) قرار دارد، این قوانین
روی **همه‌ی تب‌ها** اعمال می‌شوند: خانه، رزرو، کافه، فروشگاه، مسابقات، باشگاه، بلاگ، چت، مودال‌ها و ادمین.

### ۲) بارگذاری فقط قالب فعال
`index.ts` با `import.meta.glob` تمام فایل‌های CSS را به‌صورت ماژول‌های جداگانه باندل می‌کند
(`?inline`). هنگام تغییر قالب:

1. تگ `<style>` قالب قبلی حذف می‌شود
2. CSS قالب جدید در یک تگ `<style id="bazino-active-theme-css">` تزریق می‌شود

بنابراین در هر لحظه فقط **یک** استایل قالب در DOM وجود دارد و هیچ تداخلی بین قالب‌ها رخ نمی‌دهد.
قالب پیش‌فرض (`dark-gold`) به‌صورت ایستا ایمپورت می‌شود تا اولین رندر بدون پرش (flash) باشد.

### ۳) قالب‌های سفارشی (ساخته‌شده در پنل ادمین)
وقتی ادمین یک قالب جدید با سه رنگ (اصلی/پس‌زمینه/کارت) می‌سازد:

- `generateCustomThemeCss()` یک فایل CSS کامل از همان الگوی قالب‌های سیستمی تولید می‌کند
- قالب سفارشی در `localStorage` (کلید `bazino_custom_themes`) ذخیره می‌شود و بعد از رفرش باقی می‌ماند

## 🔌 نحوه استفاده

```ts
import { BUILT_IN_THEMES, loadThemeStylesheet } from './themes';

// تغییر قالب:
loadThemeStylesheet({ id: 'cyberpunk-cyan', name: 'Cyberpunk Cyan', type: 'built-in' });
document.body.setAttribute('data-theme', 'cyberpunk-cyan');
```

در `App.tsx` این کار به‌صورت خودکار انجام می‌شود:
- `useState` مقدار ذخیره‌شده (`localStorage['themeId']`) را می‌خواند
- `useEffect` با تغییر `themeId` فایل CSS قالب جدید را بارگذاری می‌کند
- قالب‌های سفارشی از localStorage بازیابی و به لیست قالب‌ها اضافه می‌شوند

## ➕ افزودن قالب جدید سیستمی

1. فایل `src/themes/my-theme.css` بسازید (از فایل‌های موجود الگو بگیرید)
2. قالب را در آرایه `BUILT_IN_THEMES` داخل `index.ts` ثبت کنید
3. در `ThemeScreenshot.tsx` رنگ‌های پیش‌نمایش قالب را اضافه کنید (اختیاری)

## ⚠️ نکته

- `index.css` فقط استایل‌های «پایه و مشترک» را نگه می‌دارد؛ استایل اختصاصی قالب‌ها **نباید** به آن اضافه شود.
- فایل `gaming-hub.css` مربوط به قالب قدیمی حذف‌شده است و فقط برای حفظ کد نگه داشته شده.
