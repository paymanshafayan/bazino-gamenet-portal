# 🎨 سیستم قالب‌بندی بازینو (Bazino Theme Engine)

این پوشه موتور قالب‌بندی پروژه است که به سه هدف اصلی پاسخ می‌دهد:

1. **هر قالب تمام صفحات سایت را پوشش می‌دهد** (نه فقط صفحه اصلی)
2. **هر قالب فایل CSS مجزای خودش را دارد** + **کامپوننت صفحه اصلی اختصاصی**
3. **تغییر قالب، ظاهر کامل تمام صفحات را عوض می‌کند**

---

## ✅ ساختار استاندارد قالب (فرمت واحد — نسخه ۲)

هر قالب یک پکیج `ZIP` است. **`theme.json` و `theme.css` اجباری‌اند**؛ `theme.js` از نسخه ۲ **اختیاری** است
(قالب «فقط CSS» هم معتبر است و با توکن‌ها/متغیرهای CSS کل سایت را رنگ‌آمیزی می‌کند).

```
theme.zip
├── theme.json   ← ⭐ اجباری — متادیتا + tokens + strings (چهارزبانه) + regions
├── theme.css    ← ⭐ اجباری — استایل کامل قالب (پوشش تمام صفحات)
├── theme.js     ← ⬜ اختیاری — جایگزینی «بخش‌ها»ی سایت (hero، header، footer، …) با SDK
└── assets/      ← اختیاری — تصویر، ویدئو، فونت، آیکون (در CSS با `url('assets/...')`)
```

| فایل | وضعیت | نقش |
|---|---|---|
| `theme.json` | ⭐ **اجباری** | `id`, `name`, `version`, `colors` + جدید: `sdkVersion: 2`, `tokens`, `strings`, `regions` |
| `theme.css` | ⭐ **اجباری** | `body[data-theme='<id>']{ --primary-color: …; --bz-card-2: …; }` + قوانین `.theme-<id> …` |
| `theme.js` | ⬜ اختیاری | `window.BazinoThemeSDK.registerComponent('<region>', …)` — هر بخشی که ثبت نشود، پیش‌فرض سایت رندر می‌شود |
| `assets/` | ⬜ اختیاری | مسیرهای نسبی هنگام سرو به `/api/themes/<id>/assets/...` بازنویسی می‌شوند |

### 🧩 بخش‌ها (regions) — «Partial View» برای قالب

قالب می‌تواند هر یک از بخش‌های زیر را جایگزین کند (بقیه دست‌نخورده می‌مانند):

| region | چه چیزی را جایگزین می‌کند |
|---|---|
| `header` | هدر/ناوبری بالای همه‌ی صفحات |
| `hero` | اسلایدر/هرو بالای صفحه‌ی اصلی (اسلایدهای ادمین در `props.slides`) |
| `home.genres`, `home.lounges`, `home.results`, `home.tournaments`, `home.pricing`, `home.staff`, `home.location` | بخش‌های مستقل صفحه‌ی اصلی |
| `footer` | فوتر همه‌ی صفحات |
| `mobileNav` | نوار ناوبری پایین موبایل |
| `home` | **کل** صفحه‌ی اصلی (قرارداد نسخه ۱ — همچنان پشتیبانی می‌شود؛ اگر ثبت شود، `hero` و `home.*` نادیده گرفته می‌شوند) |

- نام‌های ناشناخته (مثلاً `sidebar`) هنگام نصب با خطای واضح **رد** می‌شوند.
- سرور بخش‌های ثبت‌شده را از `theme.js` تشخیص می‌دهد و در پنل ادمین به‌صورت بج (`hero footer` / `CSS-only`) نشان می‌دهد.

### 🎨 توکن‌های طراحی و قرارداد رنگ/فونت

هر قالب با تنظیم متغیرهای CSS روی `body[data-theme='<id>']` (یا `theme.json.tokens` که به `--bz-<key>` تبدیل می‌شود) **کل** کلاس‌های سایت را عوض می‌کند — از جمله هدر، دکمه‌ها و بج‌ها که با کلاس‌های Tailwind (`text-primary`, `bg-dark-card`, …) ساخته شده‌اند:

| متغیر | کاربرد |
|---|---|
| `--primary-color`, `--secondary-color`, `--accent-color` | رنگ اصلی/ثانویه/تأکیدی — `text-primary`, `bg-primary`, `border-primary` … |
| `--dark-bg-color`, `--dark-card-color` | پس‌زمینه صفحه و کارت‌ها |
| `--bz-card-2`, `--bz-card-3`, `--bz-surface`, `--bz-surface-2` | سطوح ثانویه |
| `--bz-text`, `--bz-muted`, `--bz-success`, `--bz-info`, `--bz-violet`, `--bz-border` | متن، متن کم‌رنگ، وضعیت‌ها |
| `--bz-font-sans`, `--bz-font-display` | فونت متن و فونت تیتر |

**قرارداد RTL/فونت:** سایت چهار زبان (fa/en/ru/tr) و دو جهت دارد. فونت تیتر قالب **باید** برای فارسی/روسی fallback داشته باشد
(مثلاً `"Orbitron", "Vazirmatn", sans-serif`) — فونت‌هایی مثل Orbitron حروف فارسی ندارند و تیتر ناپدید می‌شود.
از `dir`/`props.dir` برای margin/padding جهت‌دار استفاده کنید (یا `margin-inline-start`).

### 🌐 رشته‌های چهارزبانه‌ی قالب (`strings`)

```json
{
  "id": "neon-storm", "name": "Neon Storm", "version": "2.0.0", "sdkVersion": 2,
  "tokens": { "card-2": "#0a1a12", "font-display": "\"Orbitron\", \"Vazirmatn\", sans-serif" },
  "strings": {
    "fa": { "title": "طوفان نئون", "cta": "رزرو کن" },
    "en": { "title": "Neon Storm", "cta": "Book now" },
    "ru": { "title": "Неоновый шторм", "cta": "Забронировать" },
    "tr": { "title": "Neon Fırtına", "cta": "Rezervasyon yap" }
  },
  "regions": ["hero", "footer"]
}
```
در `theme.js`: `props.ts('cta')` → رشته‌ی زبان فعلی، با fallback `en` → اولین زبان موجود → خودِ کلید.
اسلایدهای پنل ادمین هم چهارزبانه‌اند: `props.slides[i].title[language]` / `.desc[language]`.

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

### قرارداد داده (props) — نسخه ۲ (سازگار با نسخه ۱)

| prop | توضیح |
|---|---|
| `language`, `dir`, `t` | زبان فعلی (fa/en/ru/tr)، جهت (rtl/ltr)، تابع ترجمه سایت |
| `ts(key, fallback?)` | رشته‌های خود قالب از `theme.json.strings` (جدید در v2) |
| `tokens` | توکن‌های طراحی قالب (جدید در v2) |
| `slides` | اسلایدهای ادمین، نرمال‌شده و چهارزبانه: `{id, imageUrl, mobileImageUrl, target, title{fa,en,ru,tr}, desc{…}}` (جدید در v2) |
| `region`, `activeTab`, `user` | نام بخش در حال رندر، تب فعال، کاربر واردشده (جدید در v2) |
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
├── theme.js          ← بخش‌های قالب با SDK v2 (اختیاری)
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

### گام ۴: theme.js (اختیاری — جایگزینی بخش‌ها با SDK v2)
```js
(function () {
  var SDK = window.BazinoThemeSDK;
  if (!SDK) return;
  var R = SDK.React;

  // فقط هرو را عوض می‌کنیم؛ هدر/فوتر/بقیه صفحه پیش‌فرض می‌مانند
  SDK.registerComponent('hero', {
    apiVersion: 2,
    render: function (p) {
      var s = p.slides[0];
      return R.createElement('section', { className: 'my-hero', dir: p.dir },
        R.createElement('h1', null, s ? s.title[p.language] : p.ts('title')),
        R.createElement('button', { onClick: function () { p.onNavigate(s ? s.target : 'reservations'); } }, p.ts('cta'))
      );
    }
  });

  SDK.registerComponent('footer', { render: function (p) { return R.createElement('footer', null, p.settings.club_name); } });
})();
```

#### حالت نسخه ۱ — کل صفحه‌ی اصلی (همچنان معتبر)
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
