# HANDOFF PROMPT — راه‌اندازی سرور زنده و محیط تست مرورگری بازینو پرو

> **این سند برای جلسه‌ی بعدی (انسان یا مدل) نوشته شده است.**
> هدف: از صفر تا «سرور زنده + مرورگر واقعی که فارسی را درست رندر می‌کند»، بدون آزمون‌وخطا.
> هر چیزی که در این سند آمده **واقعاً اجرا و تأیید شده است** — نه فرض، نه نقل‌قول.
>
> تاریخ تنظیم: ۱۴۰۵/۰۶/۱۰ (2026-09-01) · آخرین به‌روزرسانی: ۱۴۰۵/۰۶/۱۴ (2026-09-05) · ریپو: `paymanshafayan/bazino-gamenet-portal`
> برنچ فعلی: **`arena/01a067ac-bazino-gamenet-portal`** (برنچ قبلی `arena/01a05e95-…` در این برنچ ادغام و ادامه یافته است)
>
> **اول بخش ۸ («وضعیت پروژه تا ۱۴۰۵/۰۶/۱۴») را بخوانید** — خلاصه‌ی همه‌ی تسک‌های انجام‌شده، تصمیم‌های قطعی کاربر و کار بعدی آن‌جاست.

---

## ۰. خلاصه‌ی اجرایی (اگر عجله دارید)

```bash
# ── ۱) همگام‌سازی گیت (سندباکس ری‌ست می‌شود؛ حتماً انجام دهید) ──────────────
cd /home/user/bazino-gamenet-portal
git fetch origin arena/01a067ac-bazino-gamenet-portal && git reset --hard FETCH_HEAD && git clean -fd
# ⚠️ سندباکس گاهی درخت کاری را به یک اسنپ‌شات قدیمی برمی‌گرداند در حالی که remote جلوتر است؛
#    همیشه اول `git ls-remote --heads origin arena/01a067ac-bazino-gamenet-portal` را با HEAD مقایسه کنید.

# ── ۲) وابستگی‌ها + کامپایل ماژول native (بدون هیچ دانلود خارجی) ───────────
npm install --ignore-scripts --no-audit --no-fund
(cd node_modules/better-sqlite3 && npx node-gyp rebuild --release --nodedir=/usr/local)
node -e "const D=require('better-sqlite3'); new D(':memory:'); console.log('SQLITE OK')"

# ── ۳) سرور زنده ────────────────────────────────────────────────────────────
npx tsx server.ts        # → http://0.0.0.0:3000   (با ابزار start_process اجرا کنید)

# ── ۴) محیط مرورگر ──────────────────────────────────────────────────────────
mkdir -p /home/user/browser-test && cp -r tests/e2e-browser/* /home/user/browser-test/
cd /home/user/browser-test
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
node bootstrap.cjs --ready
mkdir -p /tmp/fonts/Vazirmatn && cp node_modules/vazirmatn/fonts/ttf/*.ttf /tmp/fonts/Vazirmatn/
rm -rf /tmp/fonts-cache
export CHROMIUM_EXECUTABLE_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023/lib \
       FONTCONFIG_PATH=/tmp/fonts HOME=/tmp

# ── ۵) تست ──────────────────────────────────────────────────────────────────
node verify-env.mjs      # باید بگوید: OK: browser=149.0.7827.0 h1=hello bazino
node e2e-journey.mjs
```

زمان تقریبی کل: **۳ تا ۴ دقیقه** (بیشترش کامپایل `better-sqlite3` ≈ ۷۰ ثانیه).

---

## ۱. مشخصات محیط sandbox (تأییدشده)

| مورد | مقدار |
|---|---|
| Node | `v22.22.3` (در `/usr/local/bin`) |
| npm | `10.9.8` |
| Python | `3.11.2` (`/usr/bin/python3`) |
| کامپایلر | `g++ (Debian 12.2.0-14+deb12u1) 12.2.0` + `make` |
| هدرهای Node | `/usr/local/include/node/` — **از قبل نصب، دقیقاً هم‌نسخه با runtime** |
| سیستم‌عامل | Debian 12 |

### شبکه — چه چیزی باز است و چه چیزی بسته

آزمون واقعی با `curl -sI`:

| دامنه | وضعیت |
|---|---|
| `registry.npmjs.org` | ✅ باز (`200`) |
| `github.com` | ✅ باز (`200`) |
| `nodejs.org` | ❌ بسته |
| `cdn.playwright.dev` · `playwright.azureedge.net` | ❌ بسته |
| `fonts.googleapis.com` · `fonts.gstatic.com` | ❌ بسته |
| `api.qrserver.com` · `api.dicebear.com` · `cdn.jsdelivr.net` · `openstreetmap.org` | ❌ بسته |
| `deb.debian.org` · `storage.googleapis.com` · `registry.npmmirror.com` | ❌ بسته |

**قاعده‌ی طلایی:** هر چیزی که لازم دارید باید از `registry.npmjs.org` (یعنی از یک پکیج npm) بیاید.
**هرگز `npx playwright install` نزنید** — CDNاش بسته است و فقط وقت تلف می‌کند.

### ⚠️ آنچه بین پیام‌ها پاک می‌شود

این مورد چند بار غافلگیرم کرد؛ حتماً بخوانید:

* `node_modules/` (هم ریپو، هم `browser-test`) — **پاک می‌شود**
* `/tmp/*` (شامل `/tmp/chromium`، `/tmp/al2023`، `/tmp/fonts`) — **پاک می‌شود**
* `/home/user/browser-test/` — **کل پوشه پاک می‌شود** (به همین دلیل هارنس در ریپو زیر `tests/e2e-browser/` نگه داشته شد)
* پروسه‌های `start_process` (سرور) — **کشته می‌شوند**
* `bazino.sqlite3` — پاک می‌شود (gitignore است) و در بوت بعدی از نو ساخته می‌شود
* **`.git` محلی هم به commit قبلی برمی‌گردد** — ولی فایل‌های کاری سر جایشان می‌مانند و
  **push های قبلی روی GitHub سالم‌اند**.
  ➜ همیشه اول جلسه: `git fetch origin <branch> && git reset FETCH_HEAD`
  وگرنه `git push` با خطای `rejected (fetch first)` رد می‌شود.

---

## ۲. 🔑 کشف اصلی — چطور سرور واقعی بالا آمد

### مسئله

`server.ts` به `better-sqlite3` نیاز دارد که یک **ماژول native** است و باید کامپایل شود.
دو مسیر معمول کامپایل، هر دو در این sandbox شکست می‌خورند:

```
npm rebuild better-sqlite3
  → prebuild-install warn install unable to verify the first certificate      (دانلود باینری آماده از GitHub)
  → node-gyp http GET https://nodejs.org/download/release/v22.22.3/node-v22.22.3-headers.tar.gz
    attempt 1 failed with ECONNRESET                                          (دانلود هدرها از nodejs.org — بسته)
```

به همین دلیل در جلسه‌ی قبل نتیجه گرفته شده بود «بوت `server.ts` در sandbox ممکن نیست»
و تست‌ها روی بیلد استاتیک `dist/` انجام می‌شد.

### راه‌حل

**آن نتیجه‌گیری غلط بود.** `node-gyp` فقط به این دلیل به `nodejs.org` می‌رود که هدرها را
**دانلود** کند — ولی هدرها **از قبل روی ایمیج هستند**:

```
/usr/local/include/node/node_version.h
    #define NODE_MAJOR_VERSION 22
    #define NODE_MINOR_VERSION 22
    #define NODE_PATCH_VERSION 3      ← دقیقاً همان نسخه‌ی runtime
/usr/local/include/node/common.gypi   ← فایلی که node-gyp برای بیلد لازم دارد
```

پس کافی است با `--nodedir` به همان‌جا اشاره کنیم:

```bash
cd /home/user/bazino-gamenet-portal/node_modules/better-sqlite3
npx node-gyp rebuild --release --nodedir=/usr/local
```

خروجی موفق (≈۷۰ ثانیه، فقط چند warning بی‌ضرر از `-Wcast-function-type`):

```
  SOLINK_MODULE(target) Release/obj.target/better_sqlite3.node
  COPY Release/better_sqlite3.node
gyp info ok
```

راستی‌آزمایی:

```bash
node -e "const D=require('better-sqlite3'); const d=new D(':memory:');
         d.exec('create table t(a)'); d.prepare('insert into t values (?)').run(42);
         console.log('SQLITE OK', d.prepare('select * from t').get());"
# → SQLITE OK { a: 42 }
```

> **نکته‌ی مهم:** `npm install` را حتماً با `--ignore-scripts` بزنید. بدون آن، npm خودش
> سعی می‌کند `better-sqlite3` را بیلد کند، شکست می‌خورد و کل نصب را کند و پرخطا می‌کند.
> `sharp` prebuilt دارد و بدون مشکل کار می‌کند (`require('sharp')` تست شد ✅).

### بوت سرور

```bash
cd /home/user/bazino-gamenet-portal
npx tsx server.ts
```

خروجی موفق:

```
[Security] JWT_SECRET is not set in the environment. Using an INSECURE development-only fallback secret.
[Database Engine] Active provider initialized: SQLite
[SQLite] No users found. Creating a minimal fallback admin (no sample data will be loaded automatically).
[BAZINO Backend Server] is running beautifully with SQLite on http://0.0.0.0:3000
```

* پورت **3000** = سایت + API · پورت **24678** = Vite HMR
* حتماً با ابزار `start_process` اجرا شود، نه `bash` (وگرنه با تایم‌اوت کشته می‌شود).
* روی `0.0.0.0` گوش می‌دهد ✅ و `vite.config.ts` از قبل `allowedHosts: ['.e2b.app', '.localhost']`
  دارد و `server.ts` در حالت dev `allowedHosts: true` می‌دهد ✅ — پس **پیش‌نمایش زنده‌ی sandbox
  بدون هیچ تغییری کار می‌کند**.

### حساب‌های آماده بعد از بوت

| کاربر | رمز | نقش | توضیح |
|---|---|---|---|
| `admin` | `admin` | admin | فقط اگر جدول `users` خالی باشد ساخته می‌شود |

پیش‌فرض `data_source = sample`، یعنی کاتالوگ‌ها (سیستم‌ها، منوی کافه، محصولات، تورنمنت‌ها،
مقالات) از `server/sampleData.ts` پر می‌شوند و سایت هیچ‌وقت خالی نیست.

### راستی‌آزمایی سریع سرور

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/     # → 200
curl -s http://localhost:3000/api/systems | head -c 200             # → JSON سیستم‌ها
```

---

## ۳. مرورگر واقعی (Chromium + Playwright) بدون CDN

باینری Chromium از پکیج npm **`@sparticuz/chromium`** می‌آید (باینری + کتابخانه‌های
اشتراکی Amazon Linux 2023 + فونت‌ها، همه داخل تاربال npm).

### نسخه‌های پین‌شده (تغییرشان ندهید)

```json
"playwright":            "1.62.1",
"@playwright/test":      "1.62.1",
"@sparticuz/chromium":   "149.0.0",     →  Chromium 149.0.7827.0
"vazirmatn":             "^33.0.3",
"@fontsource/noto-naskh-arabic": "^5.3.0"
```

### راه‌اندازی

```bash
mkdir -p /home/user/browser-test
cp -r /home/user/bazino-gamenet-portal/tests/e2e-browser/* /home/user/browser-test/
cd /home/user/browser-test
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci     # بدون این متغیر، Playwright به CDN بسته می‌رود
node bootstrap.cjs --ready                     # باینری را در /tmp باز می‌کند؛ idempotent است
```

`bootstrap.cjs` چه می‌کند:
* `@sparticuz/chromium@149` **کاملاً ESM شده** (پوشه‌ی `build/cjs/` ندارد) → با
  `import(pathToFileURL(...))` داینامیک لود می‌شود.
* فایل `al2023.tar.br` (شامل `libnspr4.so` و بقیه) فقط روی Amazon Linux 2023 خودکار باز می‌شود؛
  اینجا **دستی** با `mod.inflate(...)` در `/tmp/al2023` باز می‌شود.

### متغیرهای محیطی لازم

```bash
export CHROMIUM_EXECUTABLE_PATH=/tmp/chromium
export LD_LIBRARY_PATH=/tmp/al2023/lib
export FONTCONFIG_PATH=/tmp/fonts
export HOME=/tmp
```

### 🔴 فونت فارسی — بدون این کار همه‌ی اسکرین‌شات‌ها بی‌ارزش‌اند

`@sparticuz/chromium` فقط `Open Sans` را همراه دارد. بدون فونت عربی/فارسی،
**تمام متن فارسی کاملاً خالی رندر می‌شود** در حالی که متن لاتین سالم است.
این خطرناک است چون اسکرین‌شات در نگاه اول «شبیه یک باگ چیدمان در سایت» به‌نظر می‌رسد،
در حالی که مشکل از محیط تست است. (اولین اسکرین‌شات‌های من دقیقاً همین‌طور بودند.)

راه‌حل، از npm و بدون CDN:

```bash
cd /home/user/browser-test
npm i vazirmatn
mkdir -p /tmp/fonts/Vazirmatn
cp node_modules/vazirmatn/fonts/ttf/*.ttf /tmp/fonts/Vazirmatn/
rm -rf /tmp/fonts-cache          # fontconfig باید کش را از نو بسازد
```

(`/tmp/fonts/fonts.conf` که `bootstrap.cjs` می‌سازد از قبل `<dir>/tmp/fonts</dir>` دارد،
پس نیازی به ویرایشش نیست.)

### 🔴 بلاک‌کردن منابع خارجی در هارنس — اجباری

سایت در زمان اجرا `fonts.googleapis.com` را صدا می‌زند. چون آن دامنه بسته است،
`page.screenshot()` در حالت `waiting for fonts to load` **۳۰ ثانیه تایم‌اوت می‌خورد**
و اسکرین‌شات اصلاً ذخیره نمی‌شود (و چون معمولاً `.catch()` دارد، بی‌سروصدا رد می‌شود!).

در `lib.mjs` این کار انجام شده:

```js
const EXTERNAL = /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|api\.qrserver\.com|api\.dicebear\.com|openstreetmap\.org|unpkg\.com|cdnjs\./;
await context.route(EXTERNAL, (route) => route.abort());
```

### راستی‌آزمایی محیط مرورگر

```bash
node verify-env.mjs
# → OK: browser=149.0.7827.0 h1=hello bazino
# → screenshot=/home/user/browser-test/shots/verify.png
```

اگر خطا داد: `ldd /tmp/chromium` را بزنید؛ نباید هیچ `not found` داشته باشد.

---

## ۴. هارنس تست (در ریپو: `tests/e2e-browser/`)

| فایل | کار |
|---|---|
| `lib.mjs` | لانچر مشترک: باز کردن Chromium، بلاک CDNها، جمع‌آوری خطاهای console و `pageerror` |
| `bootstrap.cjs` · `env.sh` · `verify-env.mjs` | آماده‌سازی و صحت‌سنجی محیط |
| `explore.mjs` / `explore-tabs.mjs` | نقشه‌برداری DOM هر تب (دکمه‌ها، فیلدها، هدینگ‌ها) — **قبل از نوشتن هر سناریو این را بزنید** |
| `e2e-journey.mjs` | سفر کامل کاربر: ثبت‌نام → رزرو → کافه → فروشگاه → تورنمنت → باشگاه |
| `e2e-part2.mjs` | مودال‌ها، موبایل ۳۹۰px، بلاگ/چت، `/app-download`، `/install`، ورود ادمین |
| `e2e-admin.mjs` | جاروب هر ۱۶ بخش پنل مدیریت با اسکرین‌شات |

اجرا: `BASE=http://127.0.0.1:3000 node e2e-journey.mjs`
خروجی: `shots/<name>/*.png` + `shots/<name>/report.json`

### الگوی نوشتن سناریوی جدید

```js
import { launch, outDir } from './lib.mjs';
const { browser, page, errors } = await launch({ width: 1440, height: 900 });
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4500);          // React lazy chunks + fetchهای اولیه
// … کلیک‌ها …
await page.screenshot({ path: '…/x.png', fullPage: true });
await browser.close();
```

### درس‌هایی که با هزینه به‌دست آمد

| مشکل | راه‌حل |
|---|---|
| `waitUntil: 'networkidle'` هرگز برنمی‌گردد | از `domcontentloaded` + `waitForTimeout` استفاده کنید (WebSocket همیشه باز است) |
| اسکرین‌شات بی‌سروصدا ذخیره نمی‌شود | تایم‌اوت فونت — بخش ۳ را اعمال کنید و `.catch()` را لاگ کنید |
| `header span.text-primary` نام کاربر را نمی‌دهد | لوگوی `BAZINO PRO` هم همین کلاس را دارد؛ سلکتور دقیق‌تر بزنید |
| کلیک روی دکمه‌ی سایدبار ادمین تایم‌اوت می‌خورد | آیکون `animate-spin` مجاور، عنصر را «ناپایدار» می‌کند → `el.evaluate(e => e.click())` |
| کلیدهای فارسی با ZWNJ (`‌`) در سلکتور | با regex بخشی از متن را match کنید، نه متن کامل |
| Escape مودال‌ها را نمی‌بندد | باگ واقعی سایت است (مورد E.7) — با دکمه‌ی ✕ ببندید وگرنه بقیه‌ی مراحل بلاک می‌شوند |
| اسکرین‌شات‌های PNG حجیم‌اند (۴۱MB) | با `sharp` به WebP کیفیت ۷۲ تبدیل کنید → ۴٫۷MB |

---

## ۵. وضعیت فعلی پروژه

### کامیت‌های این جلسه (روی `arena/01a05e95-bazino-gamenet-portal`)

| SHA | توضیح |
|---|---|
| `5fe1be6` | تست E2E با مرورگر واقعی + گزارش + هارنس + اسکرین‌شات‌ها |
| `0466a01` | `FIX_PLAN.md` — پلن جامع رفع ۱۱ مشکل |
| `4c9602b` | قطعی‌شدن چهار تصمیم محصولی کاربر |

### اسناد کلیدی

| فایل | محتوا |
|---|---|
| `E2E_TEST_REPORT.md` | ۱۱ یافته با شواهد، شماره خط و اسکرین‌شات |
| `FIX_PLAN.md` | پلن ۵ batchی رفع، با معیار پذیرش عینی برای هر مورد |
| `ISSUES_FOUND.md` | جدول یافته‌ها (بخش انتهایی: E.1 تا E.11) |
| `BROWSER_TESTING_SANDBOX.md` | راهنمای فنی محیط مرورگری |
| `PROJECT_STATUS_REPORT.md` | گزارش وضعیت کلی پروژه |
| `visual-testing/e2e-2026-09-01/` | ۵۴ اسکرین‌شات WebP |

### تصمیم‌های محصولی که کاربر گرفته (قطعی)

1. «بلاگ» و «چت» به ناوبری اضافه شوند؛ نمایشگرهای کد C#/Flutter از سایت مشتری جدا شوند (فایل‌ها حذف نشوند).
2. «رزروهای فعال شما» **خصوصی** شود — هر کاربر فقط رزروهای خودش را ببیند.
3. صفحه‌ی نصب (`InstallPage`) دست نخورد؛ فقط در اسناد ثبت شود که عمداً غیرفعال و تست‌نشده است.
4. ترتیب کارها: **A (امنیت و داده) → B (سیم‌کشی سفارش‌ها) → C (موبایل و ناوبری) → D (ظاهر و CDN) → E (پاک‌سازی)**.

### وضعیت پلن رفع

**`FIX_PLAN.md` کامل اجرا شد** (هر پنج batch A تا E، به‌علاوه سه مشکل اضافه که حین تست دوباره
کشف شدند). نتیجه‌ی نهایی: `tsc` تمیز · `npm test` **۲۳۰/۲۳۰** · `vite build` موفق ·
سناریوی کاربر در Chromium **۲۴/۲۴** · پنل ادمین **۱۶/۱۶** · **صفر خطای console**.
جزئیات کامل با شواهد در بخش «✅ نتیجه‌ی اجرا» انتهای `FIX_PLAN.md`.

### 🔜 قدم بعدی

پلن باز و تأییدشده‌ای وجود ندارد. موارد شناخته‌شده‌ی باقی‌مانده که **هنوز پلن ندارند**:

* ~~`transactions` و `active_coupons` ستون مالک ندارند~~ → ✅ رفع شد (`FIX_PLAN_OWNERSHIP.md`).
  همراهش دو آسیب‌پذیری دیگر هم رفع شد: تعیین ارزش کوپن توسط کلاینت، و مصرف غیراتمیک کوپن.
* نقشه‌ی OpenStreetMap تنها وابستگی خارجی باقی‌مانده در زمان اجراست.
* اپ Flutter، اپ دسکتاپ و اندازه‌گیری واقعی GTmetrix همچنان در sandbox تست‌ناپذیرند.

---

## ۵٫۵. 📜 قوانین کاربر (ثبت‌شده به دستور مستقیم کاربر)

> کاربر خواسته است **هر قانونی که تعیین می‌کند در همین سند ثبت شود**.
> این بخش با هر قانون جدید به‌روزرسانی می‌شود. شماره‌ها ثابت می‌مانند.

### قانون ۱ — چرخه‌ی «پلن ← تأیید ← اجرای بی‌وقفه»

*(ثبت‌شده در ۱۴۰۵/۰۶/۱۰)*

برای **هرگونه تغییر در کد**:

1. **اول پلن ارائه می‌شود.** بدون پلن هیچ کد محصولی دست نمی‌خورد.
2. کاربر با جمله‌ی **«شروع کن»** تأیید می‌کند.
3. پس از تأیید، اجرا **بدون وقفه تا انتهای کار و تکمیل کامل پلن** ادامه پیدا می‌کند.
4. **در میانه‌ی کار هیچ توقف و هیچ گزارش میانی داده نمی‌شود** — نه «بخش اول تمام شد»،
   نه درخواست تأیید مجدد، نه سؤال. کار تا آخر می‌رود.
5. در **انتها** فقط یک **گزارش خلاصه‌ی چندخطی** داده می‌شود. اگر کاربر سؤالی داشته باشد، خودش می‌پرسد.

**نکته‌ی اجرایی:** «تکمیل پلن» یعنی تمام batchهای پلن، نه فقط batch اول.
اگر در میانه‌ی کار مانعی پیدا شد که بدون تصمیم کاربر قابل عبور نیست، آن مورد **کنار گذاشته می‌شود**
و بقیه‌ی پلن ادامه پیدا می‌کند؛ سپس در گزارش پایانی به‌عنوان «انجام‌نشده و دلیلش» اعلام می‌شود.

---

### قانون ۲ — «غیرممکن» فقط بعد از سه مرحله تلاش گفته می‌شود

*(ثبت‌شده در ۱۴۰۵/۰۶/۱۱)*

هر وقت کاربر کاری خواست که در نگاه اول **غیرممکن** به‌نظر می‌رسد، این سه پله به‌ترتیب طی می‌شود
و **هرگز نباید از پله‌ی اول مستقیم به «نمی‌شود» پرید**:

**پله‌ی ۱ — تلاش واقعی و کامل.**
فرض‌های خودت را زیر سؤال ببر. هر مسیر جایگزینی را امتحان کن. بررسی کن آیا ابزار/فایل/کتابخانه‌ی
موردنیاز از قبل روی همین ماشین هست یا از مسیر دیگری قابل تهیه است. خطای واقعی را بخوان، به حدس
اکتفا نکن.

**پله‌ی ۲ — تحقیق وسیع روی وب.**
اگر پله‌ی ۱ جواب نداد، جست‌وجوی جدی انجام بده: مستندات رسمی، issueهای گیت‌هاب، بحث‌های
Stack Overflow، و راه‌حل‌های افرادی که با همین محدودیت روبه‌رو شده‌اند. یافته‌ها در بخش
«External Sources» یا در همین سند ثبت شوند تا دوباره جست‌وجو نشود.

**پله‌ی ۳ — درخواست کمک مشخص از کاربر.**
اگر پله‌ی ۲ هم جواب نداد، **از کاربر بخواه فایل‌ها یا ابزار موردنیاز را روی ریپو آپلود کند.**
درخواست باید **دقیق** باشد، نه کلی:

* نام دقیق فایل/پکیج و **نسخه‌ی موردنیاز** (مثلاً `better_sqlite3.node` برای Node ABI 127)
* **مسیر پیشنهادی** در ریپو برای قرار دادنش
* توضیح یک‌خطی از اینکه با آن دقیقاً چه کاری انجام می‌دهی
* در صورت وجود، لینک منبع رسمی دانلود

**ممنوع:** گفتن «در این محیط ممکن نیست» بدون گذراندن هر سه پله.

#### چرا این قانون وضع شد — نمونه‌ی واقعی همین پروژه

در جلسه‌ای قبل نتیجه گرفته شده بود «بوت کامل `server.ts` در sandbox ممکن نیست»، چون
`better-sqlite3` باید کامپایل شود و `node-gyp` برای دانلود هدرهای Node به `nodejs.org` نیاز دارد
که بلاک است. تست‌ها ماه‌ها روی بیلد استاتیک `dist/` انجام می‌شد.

آن نتیجه‌گیری **غلط** بود. با یک بررسی ساده معلوم شد هدرها **از قبل روی ایمیج نصب‌اند**:

```bash
/usr/local/include/node/node_version.h   → NODE 22.22.3 (دقیقاً هم‌نسخه با runtime)
npx node-gyp rebuild --release --nodedir=/usr/local     # ۷۰ ثانیه، بدون هیچ دانلودی
```

نتیجه: کل استک واقعی (Express + SQLite + WebSocket + JWT) بالا آمد و ده‌ها باگ واقعی پیدا شد که
با بیلد استاتیک هرگز دیده نمی‌شدند. **یک «غیرممکن»ِ بررسی‌نشده، کل کیفیت کار را محدود کرده بود.**


### خواندن نتیجه‌ی CI فلاتر (بدون دسترسی به لاگ)

دانلود لاگ اجراها بسته است (`results-receiver.actions.githubusercontent.com`)، ولی دو مسیر باز است:

```bash
# ۱) وضعیت هر استپ
gh api repos/paymanshafayan/bazino-gamenet-portal/actions/runs/<RUN_ID>/jobs \
  --jq '.jobs[].steps[] | (.number|tostring) + ". " + .name + " → " + (.conclusion//"?")'

# ۲) متن دقیق خطا (annotation) — همان جایی که پیام ::error:: ورک‌فلو ظاهر می‌شود
gh api repos/paymanshafayan/bazino-gamenet-portal/actions/runs/<RUN_ID>/jobs --jq '.jobs[].id' |
while read jid; do
  gh api repos/paymanshafayan/bazino-gamenet-portal/check-runs/$jid/annotations \
    --jq '.[] | .annotation_level + ": " + .message'
done
```

به‌علاوه خودِ ورک‌فلو `FLUTTER_CI_REPORT.md` را به برنچ commit می‌کند، پس خروجی کاملِ
`analyze`/`test`/`build` با یک `git fetch` در دسترس است — حتی وقتی جاب قرمز شده باشد
(استپ ثبت گزارش عمداً قبل از استپ گارد اجرا می‌شود).

---

## ۶. قواعد کاری که باید رعایت شوند

1. **زبان کاربر فارسی است.** پاسخ‌ها فارسی، دقیق و **صادقانه**. اگر چیزی تست نشده، صریح بگویید تست نشده.
2. **قاعده‌ی ۱۲ (سخت‌گیرانه):** هر تغییر باید با Chromium واقعی تست بصری شود،
   اسکرین‌شات تمام‌صفحه گرفته شود، و **با چشم بازبینی شود** (`read_file` روی فایل تصویر).
   اگر بینایی تصویر در جلسه‌ای خاموش بود، تحلیل را با DOM/CSS انجام دهید
   (`getBoundingClientRect`، استایل محاسبه‌شده، `scrollWidth` در برابر `innerWidth`، خطاهای console).
3. **تغییر کد = پلن ← تأیید کاربر ← پیام «شروع کن» ← اجرای بی‌وقفه تا انتها.** جزئیات کامل در بخش ۵٫۵ / قانون ۱.
4. بعد از هر batch: به‌روزرسانی `ISSUES_FOUND.md` و `SESSION_SUMMARY.md`، سپس commit + push، سپس zip تحویلی.
5. فایل zip هرگز commit نشود (`.gitignore` شامل `*.zip` است).
6. هرگاه فایل workflow باید روی GitHub جایگزین شود، **محتوای کامل فایل داخل باکس کد در چت** گذاشته شود؛
   فقط ارجاع به مسیر کافی نیست.
7. فقط روی برنچ **`arena/01a067ac-bazino-gamenet-portal`** کار و push شود.
8. **ایمیل (میل‌باکس واقعی روی bazino.pro):** کاربر گفته «فعلاً دست نگه دار» — تا دستور صریح، هیچ کار SMTP/ایمیل انجام نشود.
9. **درگاه پرداخت آنلاین پیشنهاد نشود** (حسابدار کاربر: هیچ درگاه قابل‌اتکایی در KKTC نیست). PayTR حذف نشود؛ فقط با `PAYMENT_ONLINE_ENABLED` خاموش بماند.
10. UI پرداخت/قانونی/تماس/پروفایل باید کاملاً مستقل از قالب باشد (خارج از ThemeRegion، غیرقابل بازنویسی از ZIP قالب).
11. کاربر نهایی نباید بتواند قالب انتخاب کند (قالب = انتخاب ادمین). منوی زبان فقط پرچم + کد زبان.

---

## ۷. مواردی که هنوز راه‌حلی برایشان پیدا نشده

> ⚠️ طبق **قانون ۲** این جدول یک «حکم قطعیِ غیرممکن» نیست — فهرست **پرونده‌های باز** است.
> هر بار که یکی از این‌ها لازم شد، باید دوباره هر سه پله طی شود (تلاش → تحقیق وب → درخواست
> فایل/ابزار از کاربر). ستون آخر می‌گوید دقیقاً چه چیزی از کاربر بخواهید تا مسدودیت باز شود.

| مورد | مانع فعلی | پله‌ی ۳: از کاربر چه بخواهیم |
|---|---|---|
| اجرای اپ **Flutter** | هر سه پله طی شد — گزارش کامل: `FLUTTER_SETUP_ATTEMPT.md`. دو دیوار مستقل: Dart SDK لینوکس (فقط از `storage.googleapis.com`) و `pub.dev`. هیچ Dart SDK لینوکسی روی گیت‌هاب/npm/PyPI ایندکس نشده | **آپلود SDK را نخواهید** — بی‌فایده است چون `pub.dev` هم بسته است. درخواست درست: افزودن `.github/workflows/flutter-test.yml` (محتوا در `FLUTTER_SETUP_ATTEMPT.md` §۴). بدون SDK دو ابزار محلی داریم: `tests/flutter-contract.mjs` (قرارداد API) و `tests/dart-syntax-check.py` (بررسی نحوی با tree-sitter). همین رویکرد در ریپوی `paymanshafayan/Mobilo` همین کاربر جواب داده است |
| اجرای اپ **دسکتاپ Electron** | باینری Electron از CDN بسته دانلود می‌شود | آرشیو `electron-vXX-linux-x64.zip` یا اجازه‌ی تست فقط روی CI |
| **GTmetrix / Lighthouse واقعی** | نیاز به دامنه‌ی عمومی دارد | خودِ کاربر یک بار روی `bazino.pro` اندازه بگیرد و خروجی را بدهد |
| بیلد **production کامل** | `npm run build` بخش `Management App/Bazino` را هم بیلد می‌کند (تست‌نشده) | ابتدا پله‌ی ۱: همان بخش را جداگانه بیلد کن و خطای واقعی را بخوان |
| **SQL Server / MongoDB providers** | سروری برای اتصال وجود ندارد | رشته‌ی اتصال به یک نمونه‌ی تستی، یا اجازه‌ی بالا آوردن `mongodb-memory-server` از npm |
| اسکرین‌شات بخش **«پرزنتیشن»** پنل ادمین | `page.screenshot` سه بار تایم‌اوت خورد | ابتدا پله‌ی ۱: منبع سنگین آن بخش را پیدا و در هارنس abort کن |

هر ادعایی درباره‌ی این موارد باید صریحاً با «**تست‌نشده**» علامت‌گذاری شود — نه «کار می‌کند»، نه «خراب است».

---

## ۸. وضعیت پروژه تا ۱۴۰۵/۰۶/۱۴ — همه‌ی کارهای انجام‌شده روی `arena/01a067ac-…`

> این بخش جایگزین «قدم بعدی» بخش ۵ است. هر مورد commit شده، تست شده و در Chromium بازبینی بصری شده مگر این‌که «تست‌نشده» نوشته باشد.

### ۸٫۱ فهرست کامیت‌ها (از پایه‌ی `4af6155` تا `a403c2d`)

| SHA | تسک | خلاصه |
|---|---|---|
| `4e78eb4` … `8df8e62` | ۱–۴ (i18n) | زبان پیش‌فرض بر اساس GeoIP (IR→fa, TR/CY→tr, RU→ru, بقیه→en؛ انتخاب دستی برنده)، منوی زبان فقط پرچم+کد، ترجمه‌ی کامل ru/tr برای UI مشتری و پنل ادمین و راهنمای بصری، پیام‌های خطای API محلی‌شده |
| `77a4287`, `7152a11`, `1a3559f`, `f997adb`, `d296242` | ۵–۷ (قالب‌ها) | پوشه‌ی داده‌ی ماندگار `BAZINO_DATA_DIR`/`MONGO_URL`، نصب اتمیک قالب، SDK v2 (regionهای header/hero/home.*/footer/mobileNav، design-token bridge، رشته‌های ۴زبانه، theme.js اختیاری)، README قالب بازنویسی شد (hero و هر region یک اسلات آزاد است؛ اسلایدهای ادمین هرگز hero ثبت‌شده‌ی قالب را جایگزین نمی‌کنند؛ `props.slides` اختیاری) |
| `9274d41` | ۸ | مسیرهای URL برای تب‌ها/بخش‌های ادمین (refresh-safe)، جست‌وجوی سریع بخش‌ها (نتایج = فهرست لینک)، آدرس/تلفن/نقشه‌ی واقعی İskele |
| `be84276` | ۹ | تصاویر واقعی لانژ (WebP ریسپانسیو با sharp) |
| `e3df9ce`, `a3f58f6`, `a466e23` | ۱۰ (PayTR + قانونی) | تحقیق و مستند PayTR، پیاده‌سازی iFrame API/callback/mock، صفحات قانونی/تماس/پرداخت مستقل از قالب (`src/legal/`)، واحد پول TL، ویرایشگر قانونی ادمین، نشان‌های پرداخت به‌صورت SVG ایزوله |
| `6935b53` | ۱۱ | حذف انتخاب قالب توسط کاربر (فقط ادمین)، رفع باگ SDK که خروجی DOM خامِ `render()` را نادیده می‌گرفت (هدر جایگزین نمی‌شد)، `SDK.LocationFrame` |
| `393e622`, `4c7b468` | ۱۲ (OTP/پروفایل/تیکت) | ورود با کد پیامکی (`server/sms/`: smsto/easysendsms/mock؛ محدودیت سمت سرور روی شماره+IP هم‌زمان؛ cooldown ارسال مجدد سمت سرور)، رمز دائمی اختیاری از پروفایل، `/profile[/tab]`، تیکت پشتیبانی کاربر + `/admin/tickets`، وضعیت‌ها «در حال بررسی → پاسخ داده شده → بسته‌شده خودکار پس از ۴۸ ساعت» (E.85) |
| `7955a49` | E.86 | ZIP قالب با پوشه‌ی ریشه (theme.js حذف می‌شد) رفع شد؛ قالب فعال در HTML bootstrap می‌شود؛ بدون فلش اسلایدر پیش‌فرض قبل از hero قالب |
| `a403c2d` | **۱۳ (کیف پول + در محل)** | جزئیات در ۸٫۲ |

### ۸٫۲ تسک ۱۳ — کیف پول بازینو و پرداخت در محل (آخرین کار، کامل)

**تصمیم کاربر (قطعی):** هیچ درگاه آنلاینی استفاده نمی‌شود؛ PayTR **حذف نشود ولی خاموش باشد**. رزرو/تورنمنت = کیف پول **یا** پرداخت در محل؛ بوفه/فروشگاه = فقط در محل. شارژ کیف پول فقط حضوری. پیش‌فرض‌های پذیرفته‌شده: واحد TL، پرداخت با کیف پول فوراً قطعی می‌شود، لغو کاربر قبل از مهلت → بازگشت کامل وجه.

**قوانین اعلام‌شده به کاربر (۴ زبان، با تیک پذیرش در مودال):**
- رزرو ایستگاه: حضور و پرداخت در کلاب حداقل **۱۰ دقیقه قبل از شروع سانس**؛ وگرنه رزرو خودکار باطل می‌شود.
- تورنمنت: پرداخت حضوری حداقل **۴۸ ساعت قبل از شروع**؛ وگرنه ثبت‌نام خودکار باطل می‌شود.

**بک‌اند** (`server/wallet/routes.ts`, `server/dataProviders.ts`, `server.ts`, `server/payments/paytr.ts`):
- جدول‌های `wallet_transactions` (دفتر کل append-only، `balanceAfter`، `idempotencyKey` یکتا) و `onsite_orders` در SQLite/SQL Server/Mongo. موجودی هرگز منفی نمی‌شود (بررسی اتمیک؛ 402 `INSUFFICIENT_FUNDS`).
- `paymentFulfil` پرچم‌های `__noPoints` (رزرو جا بدون امتیاز) و `__pointsOnly` (فقط امتیاز هنگام تسویه) دارد؛ `paymentUnfulfil` رزرو/تیم را آزاد می‌کند.
- `expireOnsiteOrders` هر ۶۰ ثانیه + هنگام خواندن فهرست‌ها: pending با `dueAt` گذشته → `cancelled_unpaid` + آزادسازی.
- `isOnlinePaymentEnabled()` ← `PAYMENT_ONLINE_ENABLED` (پیش‌فرض خاموش؛ `1/true/yes/on`). بدون آن `readPaytrConfig()` → `null`، `/api/payments/config` → `onlineDisabled:true`.
- API: `GET /api/payments/methods`، `GET /api/me/wallet`، `GET /api/me/onsite-orders`، `POST /api/checkout/wallet|onsite`، `POST /api/checkout/onsite/:id/cancel`، sync: `POST /api/sync/wallet/topup|charge`، `GET /api/sync/wallet/:phone`، `GET /api/sync/onsite-orders`، `POST /api/sync/onsite-orders/:id/settle|cancel`، ادمین: `/api/admin/wallet/*`، `/api/admin/onsite-orders*`. جدول کامل در `docs/payments/WALLET.md`.
- `userForPhone`: شماره را نرمال می‌کند (+90 پیش‌فرض) و برای رکوردهای قدیمی ۱۰ رقم آخر را تطبیق می‌دهد (E.89).

**فرانت (مستقل از قالب):** `src/legal/CheckoutModal.tsx` (createPortal روی body؛ اگر موجودی کم باشد «در محل» پیش‌فرض می‌شود؛ رویداد `bazino:open-auth` برای ورود و `bazino:refresh-data` برای تازه‌سازی داده در App)، در `CafeTab/ShopTab/ReservationsTab/TournamentsTab` جایگزین `PaymentCheckout` شد؛ `/profile/wallet` (`ProfileWallet.tsx`)؛ `/admin/wallet` (`AdminWalletSection.tsx`)؛ `LegalAdminSection` و `LegalFooter` وضعیت «موقتاً غیرفعال» را نشان می‌دهند. باگ تبدیل جلالی در `TournamentsTab` رفع شد (E.91).

**اپ مدیریت** (`Management App/Bazino/src/utils/walletSync.ts`, `components/WebWalletPanel.tsx`): هر شارژ/برداشت در «اعضا و کیف پول» به صف localStorage (`bazino_wallet_sync_queue`) با `idempotencyKey` ثابت می‌رود و بلافاصله/با رویداد `online`/باز شدن تب flush می‌شود؛ پنل فهرست سفارش‌های حضوری با دکمه‌های نقدی/کارت/کیف پول/لغو. آزمایش زنده روی `/management-app/` (co-located؛ loopback بدون کلید).

**تست‌ها:** `npm test` → **۳۵۴/۳۵۴** (API ۱۶۳، Unit ۸۷، UI ۴۲، DB ۳۶، Providers ۲۶). سوئیت‌های جدید: API ۳۵، Unit ۱۳، UI ۳۹. سوئیت PayTR (۱۷) با `PAYMENT_ONLINE_ENABLED=1` در env تست اجرا می‌شود.
**اسکرین‌شات‌های بازبینی‌شده:** مودال رزرو (EN دسکتاپ، موجودی کم/کافی)، تورنمنت در محل + نوتیفیکیشن مهلت (EN)، بوفه (TR موبایل ۳۹۰px)، `/profile/wallet` (EN دسکتاپ، TR موبایل)، `/admin/wallet` (TR)، کارت PayTR در `/admin/customization` (EN)، اپ مدیریت تب اعضا (FA).
**تست‌نشده:** اجرای واقعی روی SQL Server/Mongo؛ فونت فارسی در Chromium sandbox؛ Railway.

### ۸٫۳ نکات محیطی جدید (علاوه بر بخش‌های ۱–۴)

- `npm ci` روی better-sqlite3 می‌شکند → `npm_config_nodedir=/usr/local NODE_TLS_REJECT_UNAUTHORIZED=0 npm ci` یا نصب با `--ignore-scripts` و rebuild دستی (بخش ۰).
- `npx tsc` بسته‌ی جعلی `tsc@2.0.4` نصب می‌کند → همیشه `node_modules/.bin/tsc`.
- بیلد production: `node_modules/.bin/vite build` سپس `node_modules/.bin/esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs` (vite پوشه‌ی dist را پاک می‌کند؛ ترتیب مهم است). سرور production `index.html` را در بوت کش می‌کند → بعد از هر بیلد ری‌استارت.
- سرور smoke: `NODE_ENV=production PORT=3901 JWT_SECRET=s BAZINO_DATA_DIR=/tmp/wt SMS_PROVIDER=mock OTP_DEV_PEEK=1 node dist/server.cjs` (با `start_process`؛ `nohup … &` در bash می‌میرد). نصب: `POST /api/install/setup {dbType:"sqlite", installSampleData:true, adminUsername, adminPassword, adminEmail}`.
- Chromium بدون Playwright CDN: `npm i puppeteer-core @sparticuz/chromium` در `/tmp/chrtools`، `chromium.executablePath()` باینری را به `/tmp/chromium` می‌دهد ولی کتابخانه‌ها را نه → `bin/al2023.tar.br` را با brotli باز کنید و `LD_LIBRARY_PATH=/tmp/al2023/lib` بدهید. توکن ورود در `localStorage['bazino.authToken']`، زبان در `localStorage.cyber_lang`. یک زبان در هر اجرای مرورگر.
- تاریخ‌های نمونه‌ی تورنمنت‌ها به آینده (۱۴۰۵/۰۷/۱۵ …) منتقل شده تا قانون ۴۸ ساعت قابل تست باشد.

### ۸٫۴ کارهای باز / بعدی

1. **ایمیل** — متوقف به دستور کاربر. تحقیق انجام‌شده: Purelymail (~$10/سال)، Migadu، Namecheap Private Email، Google Workspace/Microsoft 365 trial؛ اجرای mail server روی Railway ناممکن (پورت 25 بسته، بدون PTR). فقط وقتی کاربر گفت ادامه دهید.
2. اجرای واقعی پرووایدرهای SQL Server/Mongo برای جدول‌های جدید (فقط شکل کوئری تست شده).
3. اپ Flutter (تست‌ناپذیر در sandbox؛ CI موجود)، اپ دسکتاپ Electron، GTmetrix واقعی — بدون تغییر نسبت به بخش ۷.
