# 🎨 سیستم قالب‌بندی بازینو (Bazino Theme Engine)

این پوشه موتور قالب‌بندی پروژه است که به سه هدف اصلی پاسخ می‌دهد:

1. **هر قالب تمام صفحات سایت را پوشش می‌دهد** (نه فقط صفحه اصلی)
2. **هر قالب فایل CSS مجزای خودش را دارد** + **کامپوننت صفحه اصلی اختصاصی**
3. **تغییر قالب، ظاهر کامل تمام صفحات را عوض می‌کند**

---

## ✅ ساختار استاندارد و اجباری قالب (فرمت واحد)

هر قالب یک پکیج `ZIP` با **سه فایل اصلی اجباری** است. بدون هر کدام، قالب **نصب نمی‌شود** و خطای واضح می‌گیرید:

```
theme.zip
├── theme.json   ← ⭐ اجباری — متادیتای قالب (نام، id، نسخه، توضیح، رنگ‌ها)
├── theme.css    ← ⭐ اجباری — استایل کامل قالب (پوشش تمام صفحات)
├── theme.js     ← ⭐ اجباری — کامپوننت صفحه اصلی قالب (با SDK ثبت می‌شود)
└── assets/      ← اختیاری — فایل‌های مورد نیاز قالب (تصویر، ویدئو، فونت، آیکون)
    ├── banner.jpg
    └── ...
```

| فایل | وضعیت | نقش |
|---|---|---|
| `theme.json` | ⭐ **اجباری** | نام قالب، شناسه (id)، نسخه، توضیح و رنگ‌ها — **سایت نام قالب را از همین‌جا می‌خواند** |
| `theme.css` | ⭐ **اجباری** | استایل کامل همه صفحات (فرمت جدید: `body[data-theme='...']` + قوانین `.theme-...`) |
| `theme.js` | ⭐ **اجباری** | کامپوننت صفحه اصلی قالب — با `window.BazinoThemeSDK.registerComponent('home', ...)` |
| `assets/` | ⬜ اختیاری | فایل‌های مورد نیاز (در CSS با مسیر نسبی `url('assets/...')`) |

### چرا `theme.js` اجباری است؟

صفحه اصلی یک قالب فقط با تغییر رنگ/استایل ساخته نمی‌شود؛ چیدمان، بخش‌ها و تعاملات آن
باید توسط **کامپوننت خود قالب** رندر شود (دقیقاً مثل قالب‌های سیستمی `GecoPurpleHome.tsx`
و `GamingAmpHome.tsx`). بنابراین:

- `theme.js` کامپوننت صفحه اصلی را می‌سازد — بدون آن قالب «ناقص» است و نصب نمی‌شود.
- اگر `theme.js` بارگذاری نشود یا کامپوننت ثبت نکند، سایت **خطای واضح** نشان می‌دهد
  (به‌جای سقوط بی‌صدا به پیش‌فرض) تا مشکل فوراً دیده شود.

---

## 🔄 جریان بارگذاری قالب (نام قالب → کامپوننت)

سایت قالب را دقیقاً به این ترتیب بارگذاری می‌کند:

```
۱) نام/شناسه قالب فعال را می‌خواند:
     localStorage['themeId'] (کاربر انتخاب کرده)
     یا theme.json قالب (هنگام نصب از ZIP ذخیره می‌شود)
     یا سرو GET /api/themes (لیست قالب‌های نصب‌شده روی سرور)

۲) theme.css قالب بارگذاری می‌شود  ← استایل تمام صفحات (یک <style> فعال)

۳) theme.js قالب از پوشه قالب بارگذاری می‌شود:
     GET /api/themes/<id>/theme.js   (قالب‌های سروری)
     یا از باندل (قالب‌های سیستمی)

۴) کامپوننت ثبت می‌شود:
     window.BazinoThemeSDK.registerComponent('home', factory)
     و صفحه اصلی را با props استاندارد رندر می‌کند

۵) اگر کامپوننت ثبت نشود ← پیام خطای واضح (نه صفحه خالی، نه پیش‌فرض بی‌صدا)
```

> نکته: قالب‌های سیستمی (dark-gold, gaming-amp, geco-purple, ...) همان‌ها را
> به‌صورت باندل‌شده در کد دارند (`GamingAmpHome.tsx` و ...) — فرمت ZIP برای
> قالب‌های نصب‌شده توسط ادمین است که `theme.js` آن‌ها از سرور سرو می‌شود.

---

## 🏗 بخش‌های استاندارد صفحه اصلی هر قالب

هر قالب (در `theme.js`) باید صفحه اصلی را از بخش‌های زیر بسازد. این فهرست
«قرارداد محتوایی» بین قالب‌هاست تا همه قالب‌ها داده‌های یکسان و کامل کلوپ را
نمایش دهند. داده‌ها از همان `props` استاندارد SDK می‌آیند.

### قوانین کلی

- **این ۴ بخش اجباری‌اند** (هسته‌ی محتوای کلوپ — قالب بدون آن‌ها ناقص است):
  **ژانرهای بازی، تورنمنت‌های فعال، نتایج مسابقات، سالن‌ها و خدمات**.
- بقیه بخش‌ها (Hero/اسلایدر، تعرفه‌ها، مربیان، چرا ما، درباره، محصولات، تماس، CTA) **اختیاری** — بسته به سبک قالب.
- ترتیب بخش‌ها آزاد است (هر قالب چیدمان خودش را دارد) ولی همه باید از همان `props` استاندارد بخوانند.
- لوگوی سایت مادر فقط از `props.logoUrl` نمایش داده شود (قانون «حق انحصاری لوگو»).

| # | بخش | وضعیت | توضیح | منبع داده |
|---|---|---|---|---|
| ۱ | **ژانرهای بازی** | ⭐ اجباری | گرید دسته‌بندی بازی‌ها (شوتر، مسابقه‌ای، نقش‌آفرینی و...) | `gameGenres` |
| ۲ | **تورنمنت‌های فعال** | ⭐ اجباری | کاروسل/گرید تورنمنت‌ها با وضعیت، تصویر و جایزه | `tournaments` |
| ۳ | **نتایج مسابقات** | ⭐ اجباری | برد نتایج اخیر مسابقات (اسکوربورد) | `matchHistory` |
| ۴ | **سالن‌ها و خدمات** | ⭐ اجباری | معرفی سالن‌ها/زون‌های کلوپ (VIP، کافه، فروشگاه و...) | `loungeSections` |
| ۵ | **Hero / اسلایدر اصلی** | ⬜ اختیاری | اسلایدهای بازی‌های ویژه: تصویر، عنوان، توضیح، دکمه CTA | `featuredGames` |
| ۶ | **تعرفه‌ها / پاس‌ها** | ⬜ اختیاری | پلن‌های قیمت‌گذاری (ساعتی، روزانه، VIP) | `pricingPackages` |
| ۷ | **مربیان و تیم** | ⬜ اختیاری | معرفی کادر/مربیان | `staffTeam` |
| ۸ | **چرا ما + آمار** | ⬜ اختیاری | امتیازات کلوپ + آمار | `settings` |
| ۹ | **درباره کلوپ** | ⬜ اختیاری | داستان/معرفی کلوپ | `settings` |
| ۱۰ | **محصولات ویژه** | ⬜ اختیاری | ویترین فروشگاه | `settings`/داده‌ها |
| ۱۱ | **تماس، آدرس و نقشه** | ⬜ اختیاری | اطلاعات تماس، شبکه‌های اجتماعی، نقشه | `settings` |
| ۱۲ | **CTA های ناوبری** | ⬜ اختیاری | دکمه‌های رفتن به رزرو/کافه/فروشگاه/مسابقات | `onNavigate` |

### قرارداد داده (props) — نسخه 1 (SDK)

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

---

## 📁 ساختار پوشه‌ها

```
src/themes/
├── index.ts            ← موتور قالب‌ها (ثبت، بارگذاری، تزریق، قالب سفارشی)
├── zip.ts              ← پکیج قالب با فرمت ZIP (پارس/ساخت/دانلود)
├── themeZipCore.ts     ← هسته مشترک پارس/ساخت ZIP (کلاینت + سرور)
├── dark-gold.css       ← قالب پیش‌فرض طلایی
├── cyberpunk-cyan.css  ← سایبرپانک فیروزه‌ای
├── geco-purple.css     ← جکو بنفش
├── gaming-amp.css      ← گیمینگ AMP
├── console-grid.css    ← گرید کنسولی (کلاسیک)
├── gaming-hub.css      ← (legacy — دیگر قابل انتخاب نیست، فقط حفظ شده)
└── README.md
```

قالب‌های نصب‌شده روی سرور (از پنل ادمین) در پوشه‌ی اختصاصی خودشان ذخیره می‌شوند:

```
themes/<theme-id>/
├── theme.json        ← متادیتای نرمال‌شده (نام قالب از همین‌جا)
├── theme.css         ← استایل کامل قالب
├── theme.js          ← کامپوننت صفحه اصلی (اجباری)
└── assets/           ← فایل‌های مورد نیاز قالب
```

---

## 🛠 ساخت قالب — گام‌به‌گام

### گام ۱: پوشه قالب را بسازید
```
my-theme/
├── theme.json
├── theme.css
├── theme.js
└── assets/
```

### گام ۲: theme.json (اجباری)
```jsonc
{
  "name": "Neon Storm",          // نام قالب (نمایش در پنل)
  "id": "neon-storm",            // شناسه (باید با body[data-theme] در CSS یکی باشد)
  "version": "1.0.0",
  "description": "قالب نئونی برای کلوپ گیمینگ",
  "colors": {
    "primary": "#00ff88",
    "bg": "#04070c",
    "card": "#0b1220"
  }
}
```

### گام ۳: theme.css (اجباری — فرمت جدید، پوشش تمام صفحات)
```css
body[data-theme='neon-storm'] { --primary-color: #00ff88; --dark-bg-color: #04070c; /* ... */ }
.theme-neon-storm .site-header { /* ... */ }
.theme-neon-storm .bg-dark-card { /* ... */ }
.theme-neon-storm .btn { /* ... */ }
/* ... تمام صفحات را پوشش دهید ... */
```

### گام ۴: theme.js (اجباری — کامپوننت صفحه اصلی با SDK)
```js
(function () {
  var SDK = window.BazinoThemeSDK;
  if (!SDK || !SDK.registerComponent) return;

  SDK.registerComponent('home', function () {
    return {
      apiVersion: 1,
      render: function (props) {
        var R = SDK.React;
        var genres = props.gameGenres || [];
        return R.createElement('div', { className: 'my-theme-home' },
          /* بخش ۱ (اجباری) — ژانرهای بازی */
          R.createElement('section', { className: 'genres' },
            genres.map(function (g) {
              return R.createElement('div', { key: g.id }, g.title);
            })
          )
          /* ... بخش‌های اجباری دیگر: تورنمنت‌ها، نتایج مسابقات، سالن‌ها و خدمات ... */
          /* ... بخش‌های اختیاری (مثل Hero/اسلایدر) طبق جدول بالا ... */
        );
      }
    };
  });
})();
```

### گام ۵: ZIP بسازید و نصب کنید
```bash
cd my-theme && zip -r ../my-theme.zip theme.json theme.css theme.js assets
```
سپس در پنل مدیریت → «مدیریت قالب‌ها» → «نصب قالب جدید» → تب **نصب از فایل ZIP**.

> نمونه‌ی آماده: دکمه «دانلود قالب نمونه» در همان پنل، یک ZIP کامل معتبر
> (شامل هر سه فایل اجباری + assets) می‌سازد — الگوی `Neon Storm`.

---

## 🏷 قانون لوگو — «حق انحصاری سایت مادر»

**لوگوی سایت متعلق به «سایت مادر» است و هیچ قالبی حق تغییر، جایگزینی، پوشاندن یا
مخفی‌کردن آن را ندارد.** لوگوی هدر اصلی (`<img class="brand-logo-guard">`) خارج از
کنترل قالب‌ها رندر می‌شود و با یک محافظ CSS تضمین شده است.

**آدرس استاندارد دریافت لوگو** (برای قالب‌هایی که در صفحه اصلی نیاز به نمایش لوگو دارند):

```
/logo.png
```

و معادل CSS آن (متغیر سراسری تعریف‌شده در `index.css`):

```css
:root { --brand-logo-url: url('/logo.png'); }
/* استفاده در قالب: */
.hero-logo { background-image: var(--brand-logo-url); }
```

---

## 🏗 معماری

### ۱) فایل مجزا برای هر قالب
هر قالب در فایل `.css` خودش شامل دو بخش است:

- **متغیرهای رنگی**: `body[data-theme='<id>'] { --primary-color: ...; --dark-bg-color: ...; --theme-*: ... }`
- **استایل سراسری اسکوپ‌شده**: `.theme-<id> .site-header`، `.theme-<id> .bg-dark-card`،
  `.theme-<id> .btn` و ...

چون کلاس `theme-<id>` روی ریشه‌ی اپلیکیشن (`<div class="theme-...">`) قرار دارد، این قوانین
روی **همه‌ی تب‌ها** اعمال می‌شوند: خانه، رزرو، کافه، فروشگاه، مسابقات، باشگاه، بلاگ، چت، مودال‌ها و ادمین.

### ۲) بارگذاری فقط قالب فعال
`index.ts` با `import.meta.glob` تمام فایل‌های CSS را به‌صورت ماژول‌های جداگانه باندل می‌کند
(`?inline`). هنگام تغییر قالب:

1. تگ `<style>` قالب قبلی حذف می‌شود
2. CSS قالب جدید در یک تگ `<style id="bazino-active-theme-css">` تزریق می‌شود

بنابراین در هر لحظه فقط **یک** استایل قالب در DOM وجود دارد. قالب پیش‌فرض (`dark-gold`)
به‌صورت ایستا ایمپورت می‌شود تا اولین رندر بدون پرش (flash) باشد.

### ۳) قالب‌های سفارشی (ساخته‌شده در پنل ادمین)
وقتی ادمین یک قالب جدید با سه رنگ (اصلی/پس‌زمینه/کارت) می‌سازد:

- `generateCustomThemeCss()` یک فایل CSS کامل از همان الگوی قالب‌های سیستمی تولید می‌کند
- `theme.js` آن با نمونه‌ی پیش‌فرض تولید می‌شود تا پکیج همیشه «فرمت واحد» داشته باشد
- قالب سفارشی در `localStorage` (کلید `bazino_custom_themes`) ذخیره می‌شود

---

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
- برای قالب‌های سروری، `theme.js` از پوشه قالب بارگذاری و کامپوننت صفحه اصلی ثبت می‌شود

---

## ➕ افزودن قالب جدید سیستمی

1. فایل `src/themes/my-theme.css` بسازید (از فایل‌های موجود الگو بگیرید)
2. قالب را در آرایه `BUILT_IN_THEMES` داخل `index.ts` ثبت کنید
3. کامپوننت صفحه اصلی (`MyThemeHome.tsx`) بسازید و در `HomeTab.tsx` به آن وصل کنید
4. در `ThemeScreenshot.tsx` رنگ‌های پیش‌نمایش قالب را اضافه کنید (اختیاری)

---

## ⚠️ نکته

- `index.css` فقط استایل‌های «پایه و مشترک» را نگه می‌دارد؛ استایل اختصاصی قالب‌ها **نباید** به آن اضافه شود.
- فایل `gaming-hub.css` مربوط به قالب قدیمی حذف‌شده است و فقط برای حفظ کد نگه داشته شده.
- **پکیج ZIP بدون `theme.js` دیگر معتبر نیست** — از این پس همه قالب‌ها باید هر سه فایل
  (`theme.json` + `theme.css` + `theme.js`) را داشته باشند.

## Performance gate for uploaded ZIP themes

Every ZIP uploaded through `POST /api/admin/themes/install` is audited **before any file is written**. The server applies safe automatic fixes: removing Google Fonts imports, adding `font-display: optional` to local font faces, compacting SVG comments/whitespace, and converting uploaded JPEG/PNG assets to WebP (quality 72, maximum 1600px side) when doing so saves bytes. CSS and `theme.js` asset references are updated with the new `.webp` name. It reports external origins and recurring timers, then rejects only files that still exceed 3 MB per asset or 8 MB total after optimization.

The installation response includes a `performance` report; the Admin Panel shows counts for automatic fixes and warnings. To audit a ZIP in CI or before upload:

```bash
npm run audit:theme -- ./my-theme.zip
npm run audit:theme -- ./my-theme.zip --fix ./my-theme.optimized.zip
npm run test:theme-performance
```

The gate never executes an uploaded `theme.js`; JavaScript is checked statically only.
