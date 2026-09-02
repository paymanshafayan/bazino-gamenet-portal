# HANDOFF PROMPT — راه‌اندازی سرور زنده و محیط تست مرورگری بازینو پرو

> **این سند برای جلسه‌ی بعدی (انسان یا مدل) نوشته شده است.**
> هدف: از صفر تا «سرور زنده + مرورگر واقعی که فارسی را درست رندر می‌کند»، بدون آزمون‌وخطا.
> هر چیزی که در این سند آمده **واقعاً اجرا و تأیید شده است** — نه فرض، نه نقل‌قول.
>
> تاریخ تنظیم: ۱۴۰۵/۰۶/۱۰ (2026-09-01) · ریپو: `paymanshafayan/bazino-gamenet-portal`
> برنچ: `arena/01a05e95-bazino-gamenet-portal`

---

## ۰. خلاصه‌ی اجرایی (اگر عجله دارید)

```bash
# ── ۱) همگام‌سازی گیت (سندباکس ری‌ست می‌شود؛ حتماً انجام دهید) ──────────────
cd /home/user/bazino-gamenet-portal
git fetch origin arena/01a05e95-bazino-gamenet-portal && git reset FETCH_HEAD

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

### 🔜 قدم بعدی

**Batch A از `FIX_PLAN.md`** — منتظر پیام «شروع کن» از کاربر بود.
شامل: حذف fallback به `activeUsername` در `getCurrentUser()` (نشت ایمیل و تلفن به مهمان)،
و افزودن `resolveTransactionalList()` تا رزرو واقعی کاربر زیر داده‌ی نمونه پنهان نشود.

---

## ۶. قواعد کاری که باید رعایت شوند

1. **زبان کاربر فارسی است.** پاسخ‌ها فارسی، دقیق و **صادقانه**. اگر چیزی تست نشده، صریح بگویید تست نشده.
2. **قاعده‌ی ۱۲ (سخت‌گیرانه):** هر تغییر باید با Chromium واقعی تست بصری شود،
   اسکرین‌شات تمام‌صفحه گرفته شود، و **با چشم بازبینی شود** (`read_file` روی فایل تصویر).
   اگر بینایی تصویر در جلسه‌ای خاموش بود، تحلیل را با DOM/CSS انجام دهید
   (`getBoundingClientRect`، استایل محاسبه‌شده، `scrollWidth` در برابر `innerWidth`، خطاهای console).
3. **تغییر کد = پلن ← تأیید کاربر ← پیام «شروع کن».** بدون این، کد محصولی دست نخورد.
4. بعد از هر batch: به‌روزرسانی `ISSUES_FOUND.md` و `SESSION_SUMMARY.md`، سپس commit + push، سپس zip تحویلی.
5. فایل zip هرگز commit نشود (`.gitignore` شامل `*.zip` است).
6. هرگاه فایل workflow باید روی GitHub جایگزین شود، **محتوای کامل فایل داخل باکس کد در چت** گذاشته شود؛
   فقط ارجاع به مسیر کافی نیست.
7. فقط روی برنچ `arena/01a05e95-bazino-gamenet-portal` کار و push شود.

---

## ۷. آنچه هنوز در sandbox ممکن **نیست** (صادقانه)

| مورد | دلیل |
|---|---|
| اجرای اپ **Flutter** | SDK فلاتر نصب نیست و دانلودش بسته است |
| اجرای اپ **دسکتاپ Electron** | باینری Electron از CDN بسته دانلود می‌شود |
| اندازه‌گیری **GTmetrix / Lighthouse واقعی** | نیاز به دامنه‌ی عمومی `bazino.pro` دارد |
| تست بیلد **production** | `npm run build` بخش `Management App/Bazino` را هم بیلد می‌کند (تست‌نشده در sandbox) |
| تست **SQL Server / MongoDB providers** | سروری برای اتصال وجود ندارد؛ فقط `SqliteStore` قابل تست است |

هر ادعایی درباره‌ی این پنج مورد باید با «تست‌نشده» علامت‌گذاری شود.
