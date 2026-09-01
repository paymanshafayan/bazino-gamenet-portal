# گزارش تست سرتاسری (E2E) با مرورگر واقعی — بازینو پرو

**تاریخ:** ۱۴۰۵/۰۶/۱۰ (2026-09-01) · **محیط:** sandbox Arena · **مرورگر:** Chromium 149.0.7827.0 (headless, Playwright 1.62.1)
**سرور:** `npx tsx server.ts` روی `0.0.0.0:3000` با **SQLite واقعی** (`bazino.sqlite3`) · **حالت داده:** `data_source = sample` (پیش‌فرض)

---

## ۰. دستاورد کلیدی این جلسه — سرور زنده در sandbox

در جلسه‌ی قبل نتیجه گرفته شده بود که «بوت کامل `server.ts` در sandbox ممکن نیست» چون `better-sqlite3`
باینری native می‌خواهد و `prebuild-install` و `node-gyp` هر دو به دامنه‌های بلاک‌شده
(`github.com` release assets / `nodejs.org` headers) نیاز دارند.

**این فرض غلط بود.** هدرهای Node **از قبل روی خود ایمیج نصب‌اند**:

```
/usr/local/include/node/node_version.h  → NODE_MAJOR 22 / MINOR 22 / PATCH 3   (دقیقاً هم‌نسخه با runtime)
/usr/local/include/node/common.gypi
g++ 12.2.0 · make · python3.11  → همه موجود
```

پس کافی است node-gyp را به‌جای دانلود، به همین مسیر وصل کنیم:

```bash
cd /home/user/bazino-gamenet-portal/node_modules/better-sqlite3
npx node-gyp rebuild --release --nodedir=/usr/local     # ~70 ثانیه، بدون هیچ دانلودی
```

نتیجه: `SQLITE OK { a: 42 }` — و بلافاصله بعد از آن:

```
[Database Engine] Active provider initialized: SQLite
[SQLite] No users found. Creating a minimal fallback admin (no sample data will be loaded automatically).
[BAZINO Backend Server] is running beautifully with SQLite on http://0.0.0.0:3000
```

یعنی **کل استک واقعی** (Express + WebSocket + Vite middleware + SQLite + JWT + bcrypt) در sandbox بالا می‌آید،
نه فقط بیلد استاتیک. `vite.config.ts` هم از قبل `allowedHosts: ['.e2b.app']` دارد، پس preview زنده هم کار می‌کند.

### فونت فارسی در Chromium سندباکس
`@sparticuz/chromium` فقط Open Sans دارد؛ متن فارسی **کاملاً خالی** رندر می‌شد. راه‌حل بدون CDN:

```bash
npm i vazirmatn                                   # از registry.npmjs.org (تنها مسیر باز)
mkdir -p /tmp/fonts/Vazirmatn
cp node_modules/vazirmatn/fonts/ttf/*.ttf /tmp/fonts/Vazirmatn/
rm -rf /tmp/fonts-cache                           # fontconfig کش را دوباره بسازد
```

### بلاک‌کردن منابع خارجی در هارنس
`page.screenshot()` روی صفحاتی که `fonts.googleapis.com` می‌خواهند ۳۰ ثانیه در «waiting for fonts to load»
گیر می‌کرد. در `lib.mjs` این دامنه‌ها abort می‌شوند:
`fonts.googleapis.com` · `fonts.gstatic.com` · `cdn.jsdelivr.net` · `api.qrserver.com` · `api.dicebear.com` · `openstreetmap.org`

---

## ۱. سناریوی کاربر واقعی — چه چیزهایی تست شد

کاربر تازه‌ای ساخته شد (`Gamer_950231` / `gamer950231@bazino.test` / `09129502311`) و **تمام مسیر خرید**
مثل یک مشتری واقعی با کلیک‌های مرورگری طی شد. اسکرینشات تمام‌صفحه‌ی هر مرحله در
`visual-testing/e2e-2026-09-01/` ذخیره شده است.

| # | سناریو | نتیجه | شاهد |
|---|---|---|---|
| 1 | باز کردن صفحه‌ی اصلی (دسکتاپ ۱۴۴۰px) | ✅ رندر کامل، بدون overflow افقی | `e2e/01-home-desktop.webp` |
| 2 | خروج از نشست پیش‌فرض | ⚠️ سایت **از قبل لاگین بود** (بخش ۲.۱) | `e2e/02-*.webp` |
| 3 | ثبت‌نام کاربر جدید | ✅ توست موفقیت + کاربر در جدول `users` | `e2e/03-*.webp` |
| 4 | انتخاب ایستگاه از پلان سالن | ✅ ۳ ایستگاه آزاد، «مشغول»ها غیرقابل انتخاب | `e2e/04-*.webp` |
| 5 | انتخاب ۳ ساعت + کد تخفیف نامعتبر | ✅ محاسبه‌ی ۱۰۵٬۰۰۰ تومان درست | `e2e/05-*.webp` |
| 6 | پرداخت و تأیید نهایی رزرو | ✅ توست: «رزرو … با موفقیت انجام شد! 10 امتیاز…» | `e2e/06-*.webp` |
| 7 | دیدن رزرو در «رزروهای فعال شما» | ❌ **باگ ۲.۲ — رزرو کاربر هرگز نمایش داده نمی‌شود** | `e2e/07-*.webp` |
| 8 | افزودن ۳ آیتم به سبد کافه | ✅ سبد و جمع ۲۷۵٬۰۰۰ تومان درست | `e2e/08-*.webp` |
| 9 | ثبت نهایی سفارش بوفه | ❌ **باگ ۲.۳ — توست موفق ولی هیچ سفارشی ثبت نمی‌شود** | `e2e/09-*.webp` |
| 10 | خرید از فروشگاه تجهیزات | ❌ **باگ ۲.۳ — همان مشکل** | `e2e/10-*.webp` |
| 11 | ثبت‌نام تیم در تورنمنت | ❌ **باگ ۲.۴ — تابع stub است، هیچ درخواستی به سرور نمی‌رود** | `e2e/11-*.webp` |
| 12 | تبدیل ۱۰۰ امتیاز به کد تخفیف | ✅ کوپن `LOYAL-4CITJ` واقعاً در دیتابیس ساخته شد | `e2e/12-*.webp` |
| 13 | مودال انتخاب قالب (۵ قالب) | ⚠️ باز می‌شود ولی با Escape بسته نمی‌شود (باگ ۲.۷) | `e2e2/02,03,04` |
| 14 | تعویض واقعی قالب به Gaming AMP | ✅ کلاس `theme-gaming-amp` روی root اعمال شد | `e2e2/03-*.webp` |
| 15 | راهنمای تصویری کلوپ | ✅ باز می‌شود و اسلاید بعدی کار می‌کند | `e2e2/05-*.webp` |
| 16 | تب بلاگ | ❌ **باگ ۲.۵ — هیچ راه ورودی در UI ندارد** | `e2e2/06,07` |
| 17 | تب چت زنده | ❌ **باگ ۲.۵ — هیچ راه ورودی در UI ندارد** | `e2e2/08-*.webp` |
| 18 | ناوبری موبایل (۳۹۰px) | ❌ **باگ ۲.۶ — منو کاملاً ناپدید می‌شود** | `e2e2/09..14` |
| 19 | صفحه‌ی `/app-download` | ✅ HTTP 200 + تیتر درست | `e2e2/15-*.webp` |
| 20 | صفحه‌ی `/install` | ⚠️ صفحه‌ی نصب عمداً bypass شده (`isInstalled=true` هاردکد) | `e2e2/16-*.webp` |
| 21 | ورود ادمین (`admin`/`admin`) | ✅ بنر «ورود به پنل مدیریت» ظاهر شد | `e2e2/17-*.webp` |
| 22 | **هر ۱۶ بخش پنل مدیریت** | ✅ همه بدون خطای console بارگذاری شدند | `admin/*.webp` |

**پوشش پنل مدیریت (۱۶/۱۶):** داشبورد و آمار زنده · مدیریت کلاینت‌ها/سیستم‌ها · بوفه کافه و سفارشات ·
انبار فروشگاه قطعات · برنامه‌ریزی تورنمنت‌ها · انتشار اخبار بلاگ · اتاق‌های گفتگوی زنده ·
ارسال پیام و نوتیفیکیشن · مهاجرت‌های EF Core · مدیریت قالب‌ها · اسلایدر اپلیکیشن فلاتر ·
دانلود اپلیکیشن · سفارشی‌سازی کلوپ · لاگ‌های دیتابیس · تنظیمات API Key · پرزنتیشن.

---

## ۲. باگ‌های پیدا شده

### ۲.۱ 🔴 بحرانی — نشت اطلاعات کاربر به بازدیدکننده‌ی ناشناس

`GET /api/user` بدون هیچ توکنی، پروفایل **آخرین کاربری که وارد شده** را برمی‌گرداند:

```bash
$ curl -s http://localhost:3000/api/user      # هیچ کوکی/توکنی ارسال نشده
{"username":"Gamer_950231","email":"gamer950231@bazino.test","phone":"09129502311","loyaltyPoints":452,"role":"gamer"}
```

**ریشه:** `getCurrentUser()` در `server.ts:608` وقتی توکن نیست، به تنظیم سراسری `activeUsername` برمی‌گردد
و مسیر `/api/auth/register` و `/api/auth/login` این تنظیم را با نام کاربر تازه بازنویسی می‌کنند.

**اثر:** هر بازدیدکننده‌ی ناشناس **ایمیل و شماره تلفن** آخرین کاربر ثبت‌نام‌کرده را می‌بیند؛ رابط کاربری
هم او را «وارد شده» نشان می‌دهد. روی نصب تازه، `activeUsername = admin` است، یعنی هر بازدیدکننده
بنر «ورود به پنل مدیریت» را می‌بیند (که در تست هم دقیقاً همین اتفاق افتاد).

> نکته‌ی مثبت: مسیرهای پرامتیاز واقعاً `requireAuth`/`requireAdmin` دارند و JWT می‌خواهند، پس
> **دسترسی ادمین واقعاً باز نیست** — ولی نشت PII و UI گمراه‌کننده به‌تنهایی جدی است.

**پیشنهاد رفع:** حذف کامل fallback به `activeUsername` در `getCurrentUser()` — بدون توکن همیشه `Guest`.

---

### ۲.۲ 🔴 رزرو ثبت‌شده هرگز به کاربر نشان داده نمی‌شود

رزرو **واقعاً در دیتابیس نوشته می‌شود**:

```
reservation_logs → [{ id:"cb2tl60", systemId:"s1", username:"Gamer_950231",
                      startTime:"14:00", endTime:"17:00", totalPrice:105000, checkedIn:0 }]
```

اما `GET /api/reservations` سه رکورد نمونه (`r1,r2,r3`) برمی‌گرداند، چون `resolveSampleList()`
(`server.ts:90`) در حالت `sample` **همیشه** داده‌ی نمونه را برمی‌گرداند و دیتابیس را نادیده می‌گیرد.
`data_source` پیش‌فرض هم `sample` است.

**اثر:** مشتری پول می‌دهد، توست موفقیت می‌بیند، ولی در «بارکدهای ورود و رزروهای فعال شما»
QRهای سه نفر دیگر را می‌بیند و رزرو خودش نیست. عملاً محصول در پیکربندی پیش‌فرض غیرقابل استفاده است.

**پیشنهاد رفع:** برای لیست‌های *تراکنشی* (رزرو، سفارش، تراکنش امتیاز) هرگز sample جایگزین دیتابیس نشود؛
sample فقط برای *کاتالوگ* (سیستم‌ها، منوی کافه، محصولات، مقالات) معنی دارد. یا: در حالت sample هم
اگر دیتابیس رکورد دارد، دیتابیس + نمونه merge شود.

---

### ۲.۳ 🔴 سفارش کافه و خرید فروشگاه اصلاً به سرور ارسال نمی‌شوند

`CafeTab.handleCheckout` (خط ۱۴۲) و `ShopTab.handleCheckout` (خط ۱۴۳) فقط
`onAddLoyaltyPoints()` را صدا می‌زنند و توست موفقیت نشان می‌دهند — **هیچ `fetch` به
`POST /api/cafe/order` یا معادل فروشگاه ندارند** (این route در `server.ts:1840` وجود دارد و بلااستفاده مانده).

شاهد در دیتابیس بعد از دو خرید موفق در مرورگر:

```
cafe_orders  → []
shop_orders  → []
```

شاهد بصری از دید ادمین (`admin/01-داشبورد-و-آمار-زنده.webp`):
> «کل درآمد فروشگاه و بوفه: **۰ تومان**» · «No active cafe orders in queue» · «No hardware accessory orders recorded»

**اثر:** سفارش مشتری هرگز به آشپزخانه/کانتر نمی‌رسد. این یعنی ماژول کافه و فروشگاه در عمل صرفاً دمو است.

---

### ۲.۴ 🔴 ثبت‌نام تورنمنت و ثبت کامنت بلاگ، توابع خالی (stub) هستند

```ts
// src/App.tsx:397
const handleRegisterTeam = async (tournamentId, team) => {
  addNotification('Registered successfully', 'success');      // ← همین. بدون هیچ fetch
};
const handleAddComment = async (articleId, comment) => {
  addNotification('Comment added', 'success');                // ← همین
};
```

در حالی که `POST /api/tournaments/register` (خط ۲۰۲۵ سرور) پیاده‌سازی شده است.
جدول `tournaments` بعد از ثبت‌نام موفق تیم در مرورگر: `[]`.
تیم فقط در state کلاینت ظاهر می‌شود و با یک refresh ناپدید می‌شود.

---

### ۲.۵ 🟠 تب‌های «بلاگ» و «چت زنده» هیچ راه ورودی در رابط کاربری ندارند

`activeTab === 'blog'` و `activeTab === 'chat'` و `'csharp'` و `'flutter'` در `App.tsx` رندر می‌شوند،
اما هیچ دکمه‌ای در هدر، فوتر یا صفحه‌ی اصلی `setActiveTab('blog')` یا `'chat'` صدا نمی‌زند.
تست خودکار در کل DOM هیچ ورودی‌ای پیدا نکرد (`e2e2/06`, `e2e2/08`).
یعنی `BlogTab.tsx`، `ChatTab.tsx`، `CsharpCodeViewer.tsx` و `FlutterCodeViewer.tsx` **کد مرده‌اند**
در حالی که ادمین در پنل خود می‌تواند مقاله منتشر کند و اتاق گفتگو بسازد.

---

### ۲.۶ 🟠 روی موبایل هیچ ناوبری‌ای وجود ندارد

هدر: `<nav className="hidden md:flex …">` (`App.tsx:622`) — زیر ۷۶۸px مخفی می‌شود و
**هیچ منوی همبرگری یا نوار پایین جایگزینش نمی‌شود**. تست در ۳۹۰×۸۴۴:

```json
{ "navVisible": false,
  "visibleButtons": ["Logout","همین حالا رزرو کن","مشاهده رزروها","مشاهده رزروها",
                     "مشاهده رزروها","مشاهده رزروها","بستن","رفتن به صفحه دانلود"] }
```

تنها راه رسیدن به تب‌ها، دکمه‌های CTA داخل صفحه‌ی اصلی است — و برای «کافه»، «فروشگاه»، «مسابقات»
و «باشگاه» حتی همان هم موجود نیست. کاربر موبایل عملاً در صفحه‌ی اصلی حبس است.
(نکته‌ی مثبت: در تمام تب‌ها `scrollWidth === innerWidth === 390`، یعنی **هیچ overflow افقی وجود ندارد**.)

---

### ۲.۷ 🟡 مودال‌ها با کلید Escape بسته نمی‌شوند

مودال انتخاب قالب و راهنمای تصویری هر دو `closedByEscape: false`. در تست اول همین باعث شد
مودال قالب باز بماند و ۸ مرحله‌ی بعدی را بلاک کند — دقیقاً همان اتفاقی که برای یک کاربر واقعی می‌افتد
اگر عادت به Escape داشته باشد. (بستن با دکمه‌ی ✕ درست کار می‌کند.)

---

### ۲.۸ 🟡 شرح تراکنش‌های امتیاز در دیتابیس `null` می‌شود

`CafeTab`/`ShopTab`/`TournamentsTab` متن شرح را پاس می‌دهند، اما امضای تابع در `App.tsx:380`
پارامتر دوم را نمی‌پذیرد:

```ts
const handleAddLoyaltyPoints = async (points: number) => {          // ← description گم می‌شود
  await fetch('/api/user/points', { … body: JSON.stringify({ points }) });   // ← ارسال هم نمی‌شود
};
```

نتیجه در جدول `transactions`:

```
{ points: 27,  description: null }
{ points: 380, description: null }
{ points: 25,  description: null }
```

یعنی «تاریخچه امتیازات باشگاه مشتریان» با ردیف‌های بی‌عنوان پر می‌شود.

---

### ۲.۹ 🟡 نوع تراکنش ناشناخته، «خرج امتیاز» نمایش داده می‌شود

در `SAMPLE_TRANSACTIONS` رکورد اول `type: 'Bonus'` است، ولی UI فقط `Earned`/`Redeemed` را می‌شناسد
و بقیه را به شاخه‌ی «خرج امتیاز» می‌فرستد. خروجی واقعی صفحه‌ی باشگاه:

> «شارژ اولیه حساب کاربری (خوش‌آمدگویی) — **خرج امتیاز** — **+100 PTS**»

یعنی برچسب «خرج» با علامت مثبت امتیاز در تناقض است.

---

### ۲.۱۰ 🟡 وابستگی زمان‌اجرا به CDNهای خارجی

درخواست‌های ناموفق ثبت‌شده در طول تست:

| منبع | کاربرد | ریسک |
|---|---|---|
| `api.qrserver.com` | تولید QR رزرو و QR دانلود اپ | QR رزرو **اصلاً نمایش داده نمی‌شود** اگر فیلتر/قطع باشد |
| `api.dicebear.com` | آواتار کاربران چت | آواتار خراب |
| `openstreetmap.org` | نقشه‌ی موقعیت کلوپ | iframe خالی |
| `fonts.googleapis.com` | فونت Vazirmatn | **رندر متن را ۳۰ ثانیه بلاک می‌کند** (در تست، screenshot تایم‌اوت خورد) |
| `cdn.jsdelivr.net` | استایل highlight.js در پنل ادمین | کد C# بدون رنگ |

برای مخاطب ایرانی این پنج مورد تقریباً همیشه کند یا بلاک‌اند. QR و فونت باید محلی شوند
(QR با یک کتابخانه‌ی سبک سمت کلاینت، فونت با self-host — که `vazirmatn` روی npm موجود است).

---

### ۲.۱۱ 🟡 موارد جزئی

* در `ReservationsTab.tsx` رشته‌ی ترکی آلوده به فارسی است: `'Lütfen önce boş bir sistem یا koltuk seçin.'`
* بنر راهنمای بخش «پرزنتیشن» در پنل ادمین متن بخش دیگری را نشان می‌دهد: «آیا در کار با بخش **«تنظیمات کلید‌ها»** …».
* دکمه‌ی «اعمال کد» در پنل رزرو در دو خط می‌شکند و از کادر بیرون می‌زند (`e2e/05-*.webp`).
* صفحه‌ی نصب (`InstallPage`) با `useState(true)` عمداً bypass شده — قابلیت موجود ولی غیرفعال و تست‌نشده.

---

## ۳. آنچه سالم بود

* رندر فارسی/RTL در همه‌ی تب‌ها و در دو viewport بدون شکستگی چیدمان.
* **بدون هیچ overflow افقی** در ۳۹۰px و ۱۴۴۰px.
* **هیچ خطای JavaScript (`pageerror`) در هیچ صفحه‌ای** — تنها خطاهای console مربوط به CDNهای بلاک‌شده بود.
* ثبت‌نام/ورود/خروج، هش bcrypt و صدور JWT درست کار می‌کنند.
* منطق قیمت‌گذاری رزرو، تخفیف، محاسبه‌ی امتیاز و اعتبارسنجی کد تخفیف نامعتبر همگی درست.
* بازخرید امتیاز → ساخت کوپن واقعی در دیتابیس (`active_coupons`) ✅
* موتور قالب: ۵ قالب، تعویض آنی و اعمال کلاس روی ریشه ✅
* پنل مدیریت: هر ۱۶ بخش بدون خطا، با فرم‌ها و لیست‌های پر ✅
* WebSocket سرور بدون خطا بالا می‌آید.

---

## ۴. اولویت پیشنهادی رفع

| اولویت | مورد | تخمین |
|---|---|---|
| ۱ | ۲.۱ نشت پروفایل به مهمان (حذف fallback `activeUsername`) | کوچک |
| ۲ | ۲.۲ نمایش رزرو واقعی کاربر (اصلاح `resolveSampleList` برای لیست‌های تراکنشی) | کوچک |
| ۳ | ۲.۳ اتصال checkout کافه/فروشگاه به APIهای موجود | متوسط |
| ۴ | ۲.۴ پیاده‌سازی `handleRegisterTeam` و `handleAddComment` | کوچک |
| ۵ | ۲.۶ منوی موبایل (همبرگری یا bottom-nav) | متوسط |
| ۶ | ۲.۵ اضافه‌کردن ورودی بلاگ/چت به ناوبری | کوچک |
| ۷ | ۲.۱۰ محلی‌سازی QR و فونت | متوسط |
| ۸ | ۲.۷ / ۲.۸ / ۲.۹ / ۲.۱۱ | کوچک |

---

## ۵. بازتولید محیط تست

```bash
# ۱) بیلد ماژول native (یک‌بار در هر جلسه، بدون شبکه‌ی خارجی)
cd /home/user/bazino-gamenet-portal
npm install --ignore-scripts --no-audit --no-fund
(cd node_modules/better-sqlite3 && npx node-gyp rebuild --release --nodedir=/usr/local)

# ۲) سرور زنده
npx tsx server.ts            # → http://0.0.0.0:3000

# ۳) مرورگر
cd /home/user/browser-test
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
node bootstrap.cjs --ready
npm i vazirmatn && mkdir -p /tmp/fonts/Vazirmatn && cp node_modules/vazirmatn/fonts/ttf/*.ttf /tmp/fonts/Vazirmatn/ && rm -rf /tmp/fonts-cache
export CHROMIUM_EXECUTABLE_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023/lib FONTCONFIG_PATH=/tmp/fonts HOME=/tmp

# ۴) اجرای سناریوها
node e2e-journey.mjs         # سفر کامل کاربر (۲۱ مرحله)
node e2e-part2.mjs           # مودال‌ها، موبایل، بلاگ/چت، صفحات مستقل، ادمین
node e2e-admin.mjs           # جاروب ۱۶ بخش پنل مدیریت
```

فایل‌های هارنس: `lib.mjs` · `explore.mjs` · `explore-tabs.mjs` · `e2e-journey.mjs` · `e2e-part2.mjs` · `e2e-admin.mjs`
(در `/home/user/browser-test/`، خارج از ریپو — بین جلسات پاک می‌شود).
