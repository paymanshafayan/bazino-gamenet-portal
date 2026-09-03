# 🎨 سیستم قالب‌بندی بازینو (Bazino Theme Engine)

این پوشه موتور قالب‌بندی پروژه است (نسخه ۲ — «بخش‌محور»). اهداف:

1. **هر قالب تمام صفحات سایت را پوشش می‌دهد** — رنگ/فونت از طریق توکن‌های CSS به هدر، دکمه‌ها، بج‌ها و همه‌ی تب‌ها می‌رسد.
2. **هر قالب می‌تواند بخش‌های دلخواه سایت را جایگزین کند** (هدر، هرو، فوتر، نوار موبایل، بخش‌های صفحه اصلی) — مثل Partial View؛ بقیه پیش‌فرض می‌مانند.
3. **چهارزبانه و دوجهته**: fa/en/ru/tr، RTL/LTR — متن‌های قالب (`strings`) و اسلایدهای ادمین همگی چهارزبانه‌اند.
4. **سازگار با گذشته**: قالب‌های نسخه ۱ (`registerComponent('home', …)`) بدون تغییر کار می‌کنند.

**خلاصه‌ی تغییرات v1 → v2**

| موضوع | نسخه ۱ | نسخه ۲ |
|---|---|---|
| `theme.js` | اجباری، فقط `home` | اختیاری؛ `header/hero/home.*/footer/mobileNav` + `home` |
| رنگ‌ها | فقط داخل `.theme-<id>` اعمال می‌شد | `--primary-color`/`--bz-*` روی `body[data-theme]` به همه‌ی کلاس‌های Tailwind می‌رسد |
| متن قالب | hard-code fa/en | `theme.json.strings.{fa,en,ru,tr}` + `props.ts()` |
| اسلایدر | `featuredGames` (fa/en) | `props.slides` نرمال‌شده‌ی چهارزبانه (عنوان + توضیح + target) |
| اعتبارسنجی | فقط وجود فایل‌ها | نام بخش‌ها هم بررسی می‌شود (ناشناخته → 400)؛ بج‌ها در پنل |

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
| `hero` | جایگاه بالای صفحه‌ی اصلی — **هر طراحی آزاد است** (ویدئو، بنر ثابت، انیمیشن، اسلایدر…). اسلایدر فقط پیش‌فرض سایت است؛ اسلایدهای ادمین در `props.slides` در دسترس‌اند ولی استفاده‌شان اختیاری است |
| `home.genres`, `home.lounges`, `home.results`, `home.tournaments`, `home.pricing`, `home.staff`, `home.location` | بخش‌های مستقل صفحه‌ی اصلی |
| `footer` | فوتر همه‌ی صفحات |
| `mobileNav` | نوار ناوبری پایین موبایل |
| `home` | **کل** صفحه‌ی اصلی (قرارداد نسخه ۱ — همچنان پشتیبانی می‌شود؛ اگر ثبت شود، `hero` و `home.*` نادیده گرفته می‌شوند) |

- **یک region فقط یک «جایگاه» است، نه یک نوع کامپوننت.** موتور هیچ محدودیتی روی خروجی `render` نمی‌گذارد؛ هرچه برگردانید همان‌جا رندر می‌شود (حتی `null`). مثلاً `hero` می‌تواند ویدئوی تمام‌عرض باشد:

  ```js
  SDK.registerComponent('hero', { apiVersion: 2, render: function (p) {
    return R.createElement('section', { className: 'arena-hero', dir: p.dir },
      R.createElement('video', { src: p.assetsBase + '/intro.mp4', autoPlay: true, muted: true, loop: true, playsInline: true }),
      R.createElement('h1', null, p.ts('heroTitle')),
      R.createElement('button', { onClick: function () { p.onNavigate('reservations'); } }, p.ts('cta')));
  } });
  ```
  توصیه (نه اجبار): اگر ادمین اسلایدی تعریف کرده (`p.slides.length > 0`)، متن/لینک آن را جایی نشان دهید تا محتوای پنل بی‌اثر نماند.
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

## 🔄 جریان بارگذاری قالب (نام قالب → بخش‌ها)

```
۱) تعیین قالب فعال:
     GET /api/themes → activeThemeId (قالب سراسری سایت که ادمین فعال کرده)
     فقط اگر localStorage['themeChoice'] === 'personal' باشد، localStorage['themeId']
     (انتخاب شخصی کاربر) بر آن غالب می‌شود. فعال‌سازی از پنل این کلید را پاک می‌کند.

۲) theme.css بارگذاری می‌شود ← یک <style id="bazino-active-theme-css"> فعال
     body[data-theme='<id>'] + کلاس theme-<id> روی ریشه‌ی اپ ست می‌شود
     theme.json.tokens به متغیرهای --bz-<key> روی body تبدیل می‌شود
     پل توکن در index.css، --primary-color/--bz-* را به کلاس‌های Tailwind می‌رساند

۳) theme.js (اگر وجود داشته باشد) با useThemeScript بارگذاری می‌شود:
     GET /api/themes/<id>/theme.js?v=<installedAt>
     قالب هر بخش را با window.BazinoThemeSDK.registerComponent('<region>', …) ثبت می‌کند

۴) رندر: هر نقطه‌ی سایت که <ThemeRegion name="hero"> دارد،
     اگر قالب آن بخش را ثبت کرده باشد → کامپوننت قالب با props استاندارد
     وگرنه → کامپوننت پیش‌فرض سایت
     ('home' نسخه ۱ کل صفحه‌ی اصلی را می‌گیرد و hero/home.* نادیده گرفته می‌شوند)

۵) خطای اجرای theme.js → پیام واضح در کنسول/رابط، و آن بخش به پیش‌فرض برمی‌گردد
```

> قالب‌های سیستمی (dark-gold, cyberpunk-cyan, geco-purple, gaming-amp, console-grid)
> کامپوننت‌هایشان باندل‌شده است؛ فرمت ZIP برای قالب‌های نصب‌شده توسط ادمین است.

---

## 🏗 بخش‌های استاندارد صفحه اصلی هر قالب

اگر قالب کل صفحه‌ی اصلی را می‌گیرد (`home` نسخه ۱) باید آن را از بخش‌های زیر بسازد؛
در نسخه ۲ هر ردیف معادل یک region مستقل است و می‌توانید فقط همان را جایگزین کنید. این فهرست
«قرارداد محتوایی» بین قالب‌هاست تا همه قالب‌ها داده‌های یکسان و کامل کلوپ را
نمایش دهند. داده‌ها از همان `props` استاندارد SDK می‌آیند.

### قوانین کلی

- **این ۴ بخش اجباری‌اند** (هسته‌ی محتوای کلوپ — قالب بدون آن‌ها ناقص است):
  **ژانرهای بازی، تورنمنت‌های فعال، نتایج مسابقات، سالن‌ها و خدمات**.
- بقیه بخش‌ها (Hero/اسلایدر، تعرفه‌ها، مربیان، چرا ما، درباره، محصولات، تماس، CTA) **اختیاری** — بسته به سبک قالب.
- ترتیب بخش‌ها آزاد است (هر قالب چیدمان خودش را دارد) ولی همه باید از همان `props` استاندارد بخوانند.
- لوگوی سایت مادر فقط از `props.logoUrl` نمایش داده شود (قانون «حق انحصاری لوگو»).

| # | بخش | region (v2) | وضعیت در `home` | توضیح | منبع داده |
|---|---|---|---|---|---|
| ۱ | **ژانرهای بازی** | `home.genres` | ⭐ اجباری | گرید دسته‌بندی بازی‌ها | `gameGenres` |
| ۲ | **تورنمنت‌های فعال** | `home.tournaments` | ⭐ اجباری | کاروسل/گرید تورنمنت‌ها با وضعیت، تصویر و جایزه | `tournaments` |
| ۳ | **نتایج مسابقات** | `home.results` | ⭐ اجباری | برد نتایج اخیر مسابقات | `matchHistory` |
| ۴ | **سالن‌ها و خدمات** | `home.lounges` | ⭐ اجباری | سالن‌ها/زون‌های کلوپ (VIP، کافه، فروشگاه…) | `loungeSections` |
| ۵ | **Hero** (طراحی آزاد: ویدئو/بنر/اسلایدر…) | `hero` | ⬜ اختیاری | پیش‌فرض سایت اسلایدر ادمین است؛ قالب هر چیزی می‌تواند بگذارد | `slides` اختیاری (fallback: `featuredGames`) |
| ۶ | **تعرفه‌ها / پاس‌ها** | `home.pricing` | ⬜ اختیاری | پلن‌های قیمت‌گذاری | `pricingPackages` |
| ۷ | **مربیان و تیم** | `home.staff` | ⬜ اختیاری | معرفی کادر/مربیان | `staffTeam` |
| ۸ | **تماس، آدرس و نقشه** | `home.location` | ⬜ اختیاری | اطلاعات تماس، شبکه‌های اجتماعی، نقشه | `settings` |
| ۹ | **هدر / ناوبری** | `header` | — | لوگو (`logoUrl`)، منوی تب‌ها (`activeTab`, `onNavigate`)، کاربر (`user`) | `t`, `settings` |
| ۱۰ | **فوتر** | `footer` | — | اطلاعات کلوپ، لینک‌ها | `settings` |
| ۱۱ | **نوار پایین موبایل** | `mobileNav` | — | ناوبری موبایل | `activeTab`, `onNavigate` |
| ۱۲ | **چرا ما / درباره / محصولات / CTA** | (داخل `home`) | ⬜ اختیاری | بخش‌های آزاد | `settings`, `onNavigate` |

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
src/themeSdk/
├── sdk.ts              ← SDK v2: THEME_REGIONS، ThemeComponentProps، رجیستری، makeThemeStrings (ts)
├── ThemeRegion.tsx     ← <ThemeRegion name="hero"> — رندر بخش قالب یا fallback پیش‌فرض
└── useThemeScript.ts   ← بارگذاری/تخلیه‌ی theme.js قالب فعال (کش نسخه‌دار)

server/themeStore.ts    ← نصب اتمیک ZIP، KNOWN_REGIONS، detectRegisteredRegions، strings/tokens در /api/themes

src/themes/
├── index.ts            ← موتور قالب‌ها (ثبت، بارگذاری CSS، تزریق توکن‌ها، قالب سفارشی)
├── zip.ts              ← پکیج قالب با فرمت ZIP (پارس/ساخت/دانلود)
├── themeZipCore.ts     ← هسته مشترک پارس/ساخت ZIP + قالب نمونه‌ی v2 (Neon Storm)
├── themeCssUtils.ts    ← ابزارهای CSS (استخراج id/رنگ، حذف کامنت)
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
├── theme.js      (اختیاری)
└── assets/
```

### گام ۲: theme.json (اجباری)
```jsonc
{
  "name": "Neon Storm",          // نام قالب (نمایش در پنل)
  "id": "neon-storm",            // شناسه (باید با body[data-theme] در CSS یکی باشد)
  "version": "2.0.0",
  "sdkVersion": 2,               // ۱ = فقط home؛ ۲ = بخش‌ها/strings/tokens
  "description": "قالب نئونی برای کلوپ گیمینگ",
  "colors": { "primary": "#00ff88", "bg": "#04070c", "card": "#0b1220" },
  "tokens": {                    // → --bz-<key> روی body
    "card-2": "#0a1a12",
    "font-display": "\"Orbitron\", \"Vazirmatn\", sans-serif"
  },
  "strings": {                   // متن‌های خود قالب — هر ۴ زبان
    "fa": { "title": "طوفان نئون", "cta": "رزرو کن" },
    "en": { "title": "Neon Storm", "cta": "Book now" },
    "ru": { "title": "Неоновый шторм", "cta": "Забронировать" },
    "tr": { "title": "Neon Fırtına", "cta": "Rezervasyon yap" }
  },
  "regions": ["hero", "footer"]  // اعلامی؛ سرور از theme.js هم تشخیص می‌دهد
}
```

### گام ۳: theme.css (اجباری — فرمت جدید، پوشش تمام صفحات)
```css
/* ۱) توکن‌ها — همین بلوک به‌تنهایی هدر/دکمه‌ها/بج‌ها/کارت‌های همه‌ی صفحات را رنگ می‌کند */
body[data-theme='neon-storm'] {
  --primary-color: #00ff88; --secondary-color: #00b8ff; --accent-color: #ff2bd6;
  --dark-bg-color: #04070c; --dark-card-color: #0b1220;
  --bz-card-2: #0a1a12; --bz-text: #eafff4; --bz-muted: #8aa39a; --bz-border: rgba(0,255,136,.25);
  --bz-font-display: "Orbitron", "Vazirmatn", sans-serif;   /* fallback فارسی/روسی اجباری */
}
/* ۲) استایل بخش‌های خود قالب (اسکوپ‌شده) */
.theme-neon-storm .neon-hero { background: url('assets/banner.svg') center/cover; }
.theme-neon-storm .neon-footer { border-top: 1px solid var(--bz-border); }
/* ۳) در صورت نیاز، override اجزای پیش‌فرض سایت */
.theme-neon-storm .site-header { backdrop-filter: blur(8px); }
/* از margin-inline-start / padding-inline-end به‌جای left/right استفاده کنید (RTL) */
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

> نمونه‌ی آماده: دکمه «دانلود قالب نمونه» در همان پنل، یک ZIP کامل معتبر v2
> (theme.json با strings/tokens، theme.css، theme.js با بخش‌های `hero` + `footer`، assets) می‌سازد — الگوی `Neon Storm`.
> قالب فقط-CSS: همان ZIP بدون `theme.js` — در پنل با بج «CSS-only» نمایش داده می‌شود.

### گام ۶: چک‌لیست قبل از انتشار
- نصب بدون خطا؛ نام بخش‌ها فقط از فهرست مجاز.
- صفحه‌ی اصلی در هر ۴ زبان (تیتر هرو در fa/ru قابل خواندن — fallback فونت).
- RTL در فارسی درست (بدون `left/right` ثابت).
- رنگ هدر/دکمه‌ها با قالب هماهنگ (توکن‌ها روی `body[data-theme]`).
- اسلایدهای پنل با عنوان/توضیح زبان فعال نمایش داده شوند (`props.slides`).
- کنسول بدون خطا؛ بدون `eval`/`new Function`/CDN خارجی (CSP).

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
- قالب فعال از `GET /api/themes` (`activeThemeId`) می‌آید؛ `localStorage['themeId']` فقط با `themeChoice === 'personal'` غالب است
- `useEffect` با تغییر `themeId` فایل CSS و توکن‌های قالب جدید را بارگذاری می‌کند
- `useThemeScript` برای قالب‌های سروری `theme.js` را بارگذاری می‌کند و بخش‌ها ثبت می‌شوند
- هر `<ThemeRegion name="…">` در App/HomeTab بخش قالب یا پیش‌فرض را رندر می‌کند

### استفاده از `ThemeRegion` در کد سایت

```tsx
import { ThemeRegion } from '../themeSdk/ThemeRegion';

<ThemeRegion name="hero" props={regionProps} fallback={<DefaultHero … />} />
```
برای اضافه‌کردن بخش جدید: نام را به `THEME_REGIONS` (sdk.ts) **و** `KNOWN_REGIONS` (themeStore.ts) اضافه کنید
(تست واحد برابر بودن این دو را چک می‌کند)، سپس در محل رندر `<ThemeRegion>` بگذارید و در این README مستند کنید.

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
- `theme.js` **اختیاری** است (قالب فقط-CSS معتبر است)؛ اگر وجود دارد فقط نام بخش‌های مجاز را ثبت کند.
- فونت تیتر بدون fallback فارسی/روسی (مثل Orbitron تنها) تیتر را در fa/ru ناپدید می‌کند.
- `theme.js` تحت CSP سایت اجرا می‌شود: بدون `eval`/`new Function`، بدون اسکریپت/فونت از CDN خارجی.

## Performance gate for uploaded ZIP themes

Every ZIP uploaded through `POST /api/admin/themes/install` is audited **before any file is written**. The server applies safe automatic fixes: removing Google Fonts imports, adding `font-display: optional` to local font faces, compacting SVG comments/whitespace, and converting uploaded JPEG/PNG assets to WebP (quality 72, maximum 1600px side) when doing so saves bytes. CSS and `theme.js` asset references are updated with the new `.webp` name. It reports external origins and recurring timers, then rejects only files that still exceed 3 MB per asset or 8 MB total after optimization.

The installation response includes a `performance` report; the Admin Panel shows counts for automatic fixes and warnings. To audit a ZIP in CI or before upload:

```bash
npm run audit:theme -- ./my-theme.zip
npm run audit:theme -- ./my-theme.zip --fix ./my-theme.optimized.zip
npm run test:theme-performance
```

The gate never executes an uploaded `theme.js`; JavaScript is checked statically only.
