# HANDOFF PROMPT — راه‌اندازی سرور زنده و محیط تست مرورگری بازینو پرو

> **این سند برای جلسه‌ی بعدی (انسان یا مدل) نوشته شده است.**
> هدف: از صفر تا «سرور زنده + مرورگر واقعی که فارسی را درست رندر می‌کند»، بدون آزمون‌وخطا.
> سوابق اجرا و تست هر بخش مربوط به همان نشست‌اند؛ نتیجهٔ تحقیق، موارد اجراشده و موارد هنوز آزمایش‌نشده باید از هم تفکیک شوند. وضعیت فعلی پس از مرج **PR #19** در **بخش ۱۶** است: قابلیت‌های batchهای ۱–۱۳ کد و رابط کاربری دارند و در `main` ادغام شده‌اند؛ کار باقی‌مانده **تکمیل شکاف‌ها و راستی‌آزمایی زنده** است، نه ساخت دوبارهٔ بخش‌ها. پروندهٔ سخت‌افزار POS همچنان متوقف است.
>
> تاریخ تنظیم: ۱۴۰۵/۰۶/۱۰ (2026-09-01) · آخرین به‌روزرسانی: **۱۴۰۵/۰۶/۱۷ (2026-09-08)**، فهرست ۷موردی کارفرما (کردیت/دستهٔ اضافه/چت/کافه/فروشگاه/باگ ادمین) در **بخش ۲۵**؛ صفحهٔ «بازی‌ها» در **بخش ۲۴** (PR #21 مرج شد)؛ گزارش قطعی دورهٔ قبل در **بخش ۲۳** و `docs/publishing/V4_DELIVERY.md` · ریپو: `paymanshafayan/bazino-gamenet-portal`
> برنچ نشست جاری: **`arena/01a0800f-bazino-gamenet-portal`**، از پایهٔ merge PR #21 (`37dde76`)؛ تحویل §۲۵ در همین برنچ کامیت/پوش و با PR در `main` ادغام می‌شود. نشست قبلی `arena/01a07cd8-bazino-gamenet-portal` (صفحهٔ Games) با PR #21 در `main` ادغام شده؛ نشست‌های `arena/01a07a2f` (PR #20) و قبل‌تر سابقه‌اند.
> **هشدار:** دستورهای fetch/reset/clean و نام شاخهٔ ابتدای بخش ۰، دستورالعمل تاریخی نشست قبل‌اند؛ در این نشست اجرا نشوند. تغییر شاخه یا reset مخرب لازم نیست؛ کار فقط روی شاخهٔ فعلی انجام شود.
>
> **وضعیت جاری: بخش ۲۳ — هشت بچ توسعه و تست محلی تکمیل شده‌اند.** 506/506 تست، TypeScript/build و Chromium چهارزبانه با مشاهدهٔ ۲۰ تصویر و restart واقعی دوباره موفق شدند. **استقرار دامنه هنوز تأیید نشده؛ dispatch آخرین بار 403 و health وب HTML است.** این پیگیری فقط اسناد/تحویل را به‌روز می‌کند؛ کار ساخته‌شده از صفر تکرار نشود.
>
> **اول بخش ۲۳ و `docs/publishing/V4_DELIVERY.md` خوانده شود.** بخش‌های ۱۹–۲۲ و متن پلن، سابقهٔ طراحی‌اند؛ گزارش‌های Batch 1–8 سابقهٔ اجرا هستند. «منتظر شروع»، شمار تست قدیمی یا مشکل قبلی push، وضعیت فعلی نیستند. مرز استقرار/تماس واقعی و کار مدیر در بخش باقی‌مانده روشن است.

---

## ۰. خلاصه‌ی اجرایی (اگر عجله دارید)

```bash
# ── ۱) همگام‌سازی گیت (سندباکس ری‌ست می‌شود؛ حتماً انجام دهید) ──────────────
cd /home/user/bazino-gamenet-portal
git fetch origin arena/01a06e3e-bazino-gamenet-portal && git reset --hard FETCH_HEAD && git clean -fd
# ⚠️ سندباکس گاهی درخت کاری را به یک اسنپ‌شات قدیمی برمی‌گرداند در حالی که remote جلوتر است؛
#    همیشه اول `git ls-remote --heads origin arena/01a06e3e-bazino-gamenet-portal` را با HEAD مقایسه کنید.
#    هرگز روی برنچ دیگری push نکنید — Arena این جلسه را با `arena/01a06e3e-bazino-gamenet-portal` ردیابی می‌کند.

# ── ۲) وابستگی‌ها + کامپایل ماژول native + ترمیم ابزار رسانه (بدون هیچ دانلود خارجی) ──
npm install --ignore-scripts --no-audit --no-fund
(cd node_modules/better-sqlite3 && npx node-gyp rebuild --release --nodedir=/usr/local)
node -e "const D=require('better-sqlite3'); new D(':memory:'); console.log('SQLITE OK')"
# اجرای باینری ffmpeg/ffprobe مجوز اجرا ندارد → تست‌های رسانه در npm test با EACCES می‌میرند؛ این خط اجباری است:
node scripts/prepare-media-tools.mjs

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

# ── ۶) سوئیت کامل (از ریشهٔ ریپو) ───────────────────────────────────────────
cd /home/user/bazino-gamenet-portal
# اگر server.ts/server/** عوض شده، اول build — تست API از dist/server.cjs اجرا می‌شود:
npm run build
npm test                 # انتظار: همه سبز (۵۱۴/۵۱۴ تا تاریخ بخش ۲۴)
```

زمان تقریبی کل: **۴ تا ۵ دقیقه** (بیشترش کامپایل `better-sqlite3` ≈ ۷۰ ثانیه و build ≈ ۲۰ ثانیه).

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


### قانون ۳ — به‌روزرسانی خودکار اسناد و commit/push همهٔ تغییرات مرتبط

*(ثبت‌شده به دستور مستقیم کاربر در ۱۴۰۵/۰۶/۱۶ — 2026-09-07)*

> «بعد از هر تغییر کد و یا اجرای پلن کل تغییرات بر روی ریپو پوش و کامنت بشه. اسناد مربوطه و همچنین هندآف پرامت بروز رسانی بشه بدون نیاز به درخواست من.»

منظور اجرایی از ثبت تغییرات، **کامیت با پیام روشن و push** است:

1. بعد از هر تغییر کد یا اجرای پلن/هر batch، **اسناد مرتبط، `ISSUES_FOUND.md`، `SESSION_SUMMARY.md` و همین `HANDOFF_PROMPT.md` خودکار به‌روز شوند**؛ کار انجام‌شده، نتیجهٔ واقعی تست، موارد باز و محدودیت‌ها دقیق تفکیک شوند.
2. **همهٔ تغییرات مرتبط با کار و مستندات آن commit و push شوند؛ درخواست یا یادآوری جداگانهٔ کاربر لازم نیست.** تغییرات صرفاً محلی و تحویل صرفِ متن چت کافی نیست.
3. کار و push فقط روی برنچ ردیابی‌شدهٔ همان نشست انجام شود؛ در این نشست: **`arena/01a07a2f-bazino-gamenet-portal`**. روی `main` یا شاخهٔ دیگر push نشود و برای همگام‌سازی، تغییرات کاربر با reset/force push حذف نشوند.
4. سکرت‌ها، فایل‌های خصوصی و خروجی‌هایی که طبق قواعد پروژه خارج از Git هستند، از «همهٔ تغییرات» مستثنا هستند؛ ZIP تحویلی تولیدشده همچنان commit نمی‌شود.
5. پس از push، رسیدن کامیت به شاخهٔ ریموت بررسی شود. شکست واقعی push/احراز هویت/تعارض صریحاً اعلام شود؛ بدون موفقیت ابزار، «پوش شد» گزارش نشود.
6. این قانون، **مجوز شروع خودکار تغییر کد قبل از پلن/تأیید نیست** و قانون ۱ را لغو نمی‌کند. ثبت اسناد و تحویل خودکار، با اجرای محصول یا انتشار/پیام/تراکنش واقعی فرق دارد.

---

### قانون ۴ — صداقت سطح اثبات و تفکیک کد همکار از لینک دوست

*(از متن کامل طرح ارسالی کاربر در ۱۴۰۵/۰۶/۱۶ — 2026-09-07؛ مرجع: `docs/payments/INSTAGRAM_AFFILIATE_DESIGN.md §۱–۳`)*

- محدودیت فنی/دسترسی/سیاست پلتفرم **پیش از اجرا** صریح بیان شود. جایگزین، با برچسب «محدودیت»، «خوداظهاری» یا «شاهد غیرمستقیم» معرفی شود، نه تأیید قطعی. قانون تلاش/تحقیق پیش از اعلام ناممکن‌بودن همچنان برقرار است.
- در این فلو **لینک دعوت خصوصی هرگز برای همکار ارسال نمی‌شود**؛ همکار فقط کد عددی و متن آماده می‌گیرد. لینک پس از کامنت کد و Gate فقط برای دوست همان referral ارسال شود؛ نه در کامنت عمومی، پرامپت عامل یا لاگ قابل‌مشاهده.
- `share_confirmed_by_friend_code` شاهد عملی کمپین است، نه تأیید رسمی Share فردی Meta. `follow_verified` فقط با سیگنال معتبر؛ دکمه به‌تنهایی `button_event_only`/خوداظهاری است. Like/Share فردیِ غیرقابل‌تأیید، verified نامیده نشود.
- متن فارسی پیام دوم در فایل مرجع محفوظ بماند؛ فقط `[عدد یکتا]` در اجرا جایگزین می‌شود. زبان‌های fa/tr/en/ru، کلیدواژه‌های مستقل و منع پاسخ زبان دیگر طبق پلن رعایت شوند.
- طرح هنوز نیازمند تأیید اجرای کد است؛ اعداد مالی پیشنهادی سند، مجوز تعیین نرخ/پرداخت واقعی نیستند. قوانین ۱ و ۳ دربارهٔ شروع اجرا و تحویل خودکار پابرجا هستند.

---

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
4. **پس از هر تغییر کد یا اجرای پلن/batch، بدون درخواست جداگانهٔ کاربر:** اسناد مرتبط، `ISSUES_FOUND.md`، `SESSION_SUMMARY.md` و همین هندآف به‌روز شوند؛ همهٔ تغییرات مرتبط commit + push و موفقیت ریموت بررسی شود (قانون ۳ / §۵٫۵). ZIP تحویلی طبق قاعدهٔ قبلی خارج از Git بماند.
5. فایل zip هرگز commit نشود (`.gitignore` شامل `*.zip` است).
6. هرگاه فایل workflow باید روی GitHub جایگزین شود، **محتوای کامل فایل داخل باکس کد در چت** گذاشته شود؛
   فقط ارجاع به مسیر کافی نیست.
7. در هر نشست فقط روی **برنچ ردیابی‌شدهٔ همان نشست** کار و push شود (نشست جاری: **`arena/01a0800f-bazino-gamenet-portal`**، پایهٔ `37dde76` پس از PR #21)؛ شاخه‌های تاریخی (`arena/01a07603-…`، `arena/01a070af-…` و قبل‌تر) مقصد کار نیستند و روی `main` مستقیماً کار یا push نشود — خروجی هر نشست با PR در `main` ادغام می‌شود.
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

### ۸٫۳٫۱ وضعیت مرج

- PR #16 (`arena/01a067ac-bazino-gamenet-portal` → `main`) باز است؛ `main` اجداد HEAD است (fast-forward، بدون تداخل).
- چک CI «Typecheck & Theme tests» از `6935b53` قرمز بود (اسکریپت قدیمی `verify-themes.ts` که theme.js را اجباری می‌دانست — E.93)؛ در `docs+ci` کامیت بعد از `35f5113` رفع شد. دو چک دیگر (Vite build، Backend boot) سبز بودند.

### ۸٫۴ کارهای باز / بعدی (قدیمی — بخش ۹ را هم ببینید)

1. **ایمیل** — متوقف به دستور کاربر. تحقیق انجام‌شده: Purelymail (~$10/سال)، Migadu، Namecheap Private Email، Google Workspace/Microsoft 365 trial؛ اجرای mail server روی Railway ناممکن (پورت 25 بسته، بدون PTR). فقط وقتی کاربر گفت ادامه دهید.
2. اجرای واقعی پرووایدرهای SQL Server/Mongo برای جدول‌های جدید (فقط شکل کوئری تست شده).
3. اپ Flutter (تست‌ناپذیر در sandbox؛ CI موجود)، اپ دسکتاپ Electron، GTmetrix واقعی — بدون تغییر نسبت به بخش ۷.
4. **کار بعدی فوری جلسهٔ بعد: تحقیق POS + اتصال به نرم‌افزار مدیریت** — بخش ۹٫۳. هنوز پلن تأییدشده و «شروع کن» ندارد؛ کد ننویس.

---

## ۹. این نشست (`arena/01a06e3e-…`) — افیلیت، اینستاگرام، POS ناتمام

> تاریخ پایان نشست: ۱۴۰۵/۰۶/۱۴ (2026-09-05). کاربر خواست جلسه بسته شود و چت جدید با همین هندآف شروع شود.

### ۹٫۱ کامیت‌های این برنچ (بعد از `9137916` روی main)

| SHA | چه شد |
|---|---|
| `dcedcb8` | طرح همکاری در فروش: seed ردیف واقعی `settings` (۱۰/۵/۱۰)، موتور کمیسیون، پنل `/admin/affiliates`، `/?ref=`، نقد حضوری |
| `4dfb6ed` | کمپین اینستاگرام Invite Your Squad: Media-ID-only + Friend Gate |

درخت کاری بعد از `4dfb6ed` تمیز بود؛ اسناد هندآف این بسته شدن جلسه روی آن می‌نشیند.

### ۹٫۲ انجام‌شده — اینستاگرام (کامل، «شروع کن» مصرف شد)

قرارداد قفل‌شدهٔ کاربر:

- پورتال به Meta وصل **نیست**. ناشر فقط `media_id` می‌فرستد.
- مسیر ingest: `POST /api/integrations/instagram/published-media` با Bearer توکن پورتال (`IG_INGEST_TOKEN` یا `ig_ingest_token` seedشده؛ **نه** کلید sync). `Idempotency-Key: instagram:<media_id>`.
- فلو Friend Gate: کامنت کلیدواژه (`SQUAD`) روی media ثبت‌شده → **یک** Private Reply (پیام۱ + دکمه فالو) → بعد دکمه **DM** پیام۲ با کد عددی یکتا (`{{code}}`) → کامنت همان عدد توسط **دوست** زیر **همان پست** = `share_confirmed_by_friend_code`.
- لینک: `/?ref=…&utm_source=instagram&utm_medium=affiliate&utm_campaign=SQUAD26`. کوپن یک‌بارمصرف فقط اگر `ig_friend_coupon_value>0`.
- کمیسیون فقط قیف رزرو/پرداخت/حضور موجود. **بدون** لیست فالوور، scraping، توکن متا، کمیسیون Follow/کامنت/Share.
- دو PR روی یک `comment_id` غیرممکن است (محدودیت Meta).
- همهٔ متن‌ها ۴ زبان در `/admin/affiliates` با `data-ig-setting` قابل ویرایش.
- شبیه‌ساز ادمین بدون Zernio: `POST /api/admin/ig/register-media|simulate-comment|simulate-button`.
- HMAC inbound `X-Zernio-Signature` روی raw body. Outbound فقط اگر `ZERNIO_API_KEY` + `ZERNIO_IG_ACCOUNT_ID`.

فایل‌ها: `server/affiliate/{igSettings,igEngine,igRoutes,zernio}.ts` · جداول `ig_media`/`ig_members`/`ig_events` در هر سه پروایدر · `src/components/AdminAffiliatesSection.tsx` · `docs/payments/AFFILIATE-IG.md`.

کلیدهای `IG_SETTING_KEYS` **جدا** از `AFFILIATE_SETTING_KEYS`اند تا تست فرم کمیسیون نشکند. `ig_ingest_token` در `SECRET_SETTING_KEYS`.

**تست اجراشده:** unit 98/98 (سوئیت ۱۵ IG سبز) · database 38/38 · providers 27/27 · `tsc --noEmit` صفر خطا. API سوئیت ۳۷ ingest+simulator سبز. ۱۰ شکست API فقط SPA/static به‌خاطر نبودن `vite build` در آن اجرا (نه منطق IG). Chromium این batch **اجرا نشد**.

رفع جانبی در همان کامیت: فساد نحوی `generateMobileImageVariant(finalo ? …` در `server.ts` اسلایدر.

### ۹٫۳ کار بعدی فوری — POS گیم‌نت + نرم‌افزار مدیریت (**ناتمام**)

کاربر عکس دستگاه POS را فرستاد و خواست **قبل از هر تغییر کد** هویت و مستندات اتصال بررسی شود، بعد تغییرات لازم در **نرم‌افزار مدیریت** (`Management App/Bazino`). تحقیق وب در این نشست **انجام نشد** (نوبت‌ها بدون `web_search` بسته می‌شدند؛ کاربر گفت مشکل را از جلسه می‌داند و چت جدید می‌خواهد).

**آنچه از روی عکس خوانده شد (تحقیق وب نشده — حدس برند است نه مستند):**

- کارتخوان دستی **Ingenico** (لوگوی ingenico روی قاب، NFC تماس‌ندار، کی‌پد استاندارد F / کاغذ / CLR زرد / تأیید سبز / STP قرمز).
- اسپلش: **`maximum 25.yıl`** — برند کارت Maximum (İş Bankası / ترکیه). تاریخ روی صفحه `03/09/2026` ساعت `13:25`.
- **`TERMINAL NO: S1E5R402`**.
- زمینه: گیم‌نت بازینو در İskele، KKTC. اتصال موردنظر: نرم‌افزار صندوق/مدیریت، نه درگاه آنلاین سایت.

**قوانین پرداخت که POS نباید نقض کند:**

- درگاه آنلاین **پیشنهاد نشود**. PayTR حذف نشود؛ فقط `PAYMENT_ONLINE_ENABLED` خاموش.
- تمام پرداخت‌های سایت از شارژ کیف پول؛ نقد کردن حضوری در اپ مدیریت ثبت می‌شود.
- تفکیک نقد/کارتخوان از قبل در چک‌لیست مدیریت (مورد ۲۲) وجود دارد — اتصال واقعی دستگاه هنوز نیست.
- قانون ۱: برای اتصال کد **اول پلن، بعد «شروع کن»**. عکس فقط تحقیق بود؛ «شروع کن» POS داده نشده.

**کار جلسهٔ بعد (به ترتیب):**

1. در **اولین پاسخ** (نه پیام جداگانهٔ «الان جستجو می‌کنم») ابزار `web_search` / `fetch_page` را صدا بزنید: Ingenico + Maximum 25.yıl + ECR/yazarkasa + KKTC + پروتکل ECR Ingenico ترکیه + ترمینال `S1E5R402`.
2. گزارش مستندات: آیا API/SDK عمومی هست، آیا فقط ECR سریال/USB است، آیا به بانک Maximum/İş Bankası محدود است، آیا برای KKTC جداست.
3. پلن اتصال به Management App (بدون نوشتن کد) — صبر برای «شروع کن».
4. کد ننویسید تا کاربر «شروع کن» بگوید.

### ۹٫۴ باگ همین نشست — نوبت بدون ابزار بسته می‌شد

چند بار پشت سر هم دستیار نوشت «الان جستجو می‌کنم» و **بدون بلوک tool call** پیام را تمام کرد → پلتفرم نوبت را کامل حساب کرد. `bash` در همان جلسه کار کرد (`TOOLS_OK`). کاربر گفت مشکل را از جستجوی وب نمی‌داند و جلسه را ببندیم.

**برای چت جدید:** هرگز متنِ وعدهٔ ابزار را بدون خودِ فراخوانی ابزار در همان پاسخ نفرستید. تحقیق POS را از پیام اول با tool call شروع کنید.

### ۹٫۵ قوانین کاربر (یادآوری — متن کامل در ۵٫۵ و ۶)

- قانون ۱: تغییر کد = پلن → «شروع کن» → اجرای بی‌وقفه تا آخر همهٔ batchها → فقط گزارش چندخطی.
- قانون ۲: «غیرممکن» فقط بعد از تلاش واقعی → تحقیق وب → درخواست مشخص فایل/ابزار.
- زبان پاسخ فارسی؛ اگر تست نشده صریح بگویید.
- قاعده ۱۲: Chromium واقعی + اسکرین‌شات تمام‌صفحه + بازبینی چشم.
- ایمیل متوقف تا دستور صریح.
- zip تحویلی commit نشود؛ بعد از هر batch: `ISSUES_FOUND.md` + `SESSION_SUMMARY.md` + commit + push روی **`arena/01a06e3e-bazino-gamenet-portal`**.

---

## ۱۰. تحقیق POS انجام شد؛ شناسایی دستگاه و طراحی باقی است

> نشست `arena/01a070af-bazino-gamenet-portal` · ۱۴۰۵/۰۶/۱۴ (2026-09-05).
> این بخش وضعیت «تحقیق وب انجام نشد» در §۹٫۳ را به‌روز می‌کند؛ **اتصال POS هنوز انجام نشده است.**

کاربر درخواست کرد ابتدا مستندات دستگاه روی وب بررسی شود و طراحی اتصال پس از آن انجام شود. جست‌وجو و خواندن واقعی منابع رسمی بانک، Ingenico، Worldline/iKasa و ادارهٔ مالیات KKTC انجام شد؛ نتیجه و لینک‌ها در **`docs/payments/POS_RESEARCH.md`** ذخیره‌اند.

### نتیجهٔ مهم

- سند عمومی **GMP-3 v5.0** ترکیه یافت و بخش‌های مرتبط خوانده شد؛ USB/سریال و Ethernet و جفت‌سازی را توضیح می‌دهد. راهنمای DİA هم اتصال USB/TCP-IP برای iDE280/iWE280/MOVE5000F و فعال‌سازی سرویس را مستند کرده است. این‌ها **تأیید سازگاری دستگاه بازینو نیستند**.
- **مرجع محلی معتبر پیدا شد:** فهرست رسمی ادارهٔ مالیات KKTC، **MICROVISE INNOVATION LTD.** را برای iWE280، iDE280 و MOVE5000F ثبت کرده است. صفحهٔ تماس شرکت: `https://www.microvise.net/iletisim/`؛ ایمیل منتشرشده `info@microvise.net`.
- **KKTC مقررات مستقل دارد:** متن تجمیعی ابلاغیهٔ ۱۴ با اصلاحیهٔ ۱۶ فوریهٔ ۲۰۲۶، جریان ÖKC/رسید مالی و ارتباط با EFT-POS را بیان می‌کند. اگر بازینو مشمول باشد، نباید در طراحی صدور رسید مالی دور زده شود. تطبیق پروتکل محلی با نسخهٔ ترکیه و نحوهٔ ثبت شارژ کیف پول نیازمند تأیید تأمین‌کننده/حسابدار است.
- **مدل دقیق همچنان نامشخص است.** `maximum 25.yıl` نشان برنامهٔ کارت است، نه مدل. `S1E5R402` فقط با برچسب TERMINAL NO در هندآف قبلی ثبت شده؛ نگاشت عمومی آن به مدل پیدا نشد. اصل عکس در پیام‌های این نشست دریافت نشده است.
- پرتال جدید Ingenico معرفی رسمی دارد ولی نشانی ورودش اینجا 403 داد. SDK خصوصی دریافت نشد. مستند عمومی بانک و PF API، جای پروتکل ECR دستگاه فعلی را نمی‌گیرند.

### کار بعدی، به ترتیب

1. دریافت عکس برچسب **MODEL** و نمای جلو، پایه/پورت‌ها و نام بانک یا نصاب از کاربر؛ بدون بازکردن قاب یا تغییر تنظیمات. شماره‌های حساس می‌توانند پوشانده شوند.
2. تأیید **همین مدل + برنامه/نسخه + قرارداد KKTC** از بانک/تأمین‌کننده و دریافت نام/نسخهٔ پروتکل، SDK رسمی، شرایط فعال‌سازی و سناریوی تست. متن آمادهٔ ترکی در گزارش موجود است؛ در این نشست ارسال نشده است.
3. سپس طراحی اتصال به مدیریت؛ پوستهٔ Electron در `desktop-app/` از قبل موجود است. انتخاب POS فعلی و `method:'pos'` در sync صرفاً ثبت دستی حسابداری‌اند، نه اتصال دستگاه.
4. کد فقط بعد از پلن و «شروع کن». درگاه آنلاین همچنان خارج از موضوع و PayTR خاموش می‌ماند.

**مرز انجام کار:** فقط تحقیق و مستندسازی + بازبینی ایستای کد. نه تماس/خرید/فعال‌سازی، نه تراکنش واقعی، نه تغییر کد، نه اجرای تست یا Chromium. E.101 باز است؛ مدل، SDK و اتصال عملی هنوز تأیید نشده‌اند.

---

## ۱۱. پلن توسعهٔ مدیریت — منتظر «شروع کن»

> ۱۴۰۵/۰۶/۱۴ (2026-09-05) · کاربر در فاصلهٔ آماده‌کردن مشخصات POS، برای توسعهٔ مدیریت **پلن** خواست؛ مجوز کدنویسی نداده است.
> سند کامل: **`docs/management/EXPANSION_PLAN.md`**. این سند و تصمیم‌های این بخش مقدم بر برداشت‌های مبهم قدیمی از سیاست پرداخت‌اند.

### خواسته‌های ثبت‌شدهٔ کاربر

1. رزرو آنلاین روی **همان ایستگاه** با ساعت شروع/پایان و وضعیت قطعی **بر اساس پرداخت**، نه check-in.
2. تب کافه و تب فروشگاه: ثبت/نمایش سفارش آنلاین و حضوری، با مشخص‌بودن ایستگاه مرتبط اگر وجود دارد.
3. تب همکاری در فروش و دسترسی به شارژ و تسویهٔ حضوری کیف پول.
4. بخش مدیریت سوشیال/بلاگ با **API Manus** و صف انتشار.
5. مدیریت کوپن‌ها و ساعات رایگان/نیم‌بها.
6. دو بخش **محتوا/انتشار** و **کوپن/ساعات ویژه** هم در مدیریت گیم‌نت و هم در پنل ادمین سایت باشند.
7. مدیریت تورنمنت در اپ مدیریت؛ امکانات موجود سایت بازاستفاده/تکمیل شوند.

### رفع ابهام — پاسخ صریح کاربر به سه سؤال

- **فقط نقدی/POS = همهٔ دریافت‌های حضوری.** استفادهٔ مشتری از موجودی کیف پول در سایت، در جاهایی که قبلاً مجاز بوده، باقی بماند. درگاه آنلاین فعال نشود.
- **تسویهٔ حضوری کیف پول = نقدکردن موجودی مشتری/پورسانت همکار.** از کیف پول کم شود و وجه در محل به او تحویل شود؛ منظور صرفاً پرداخت سفارش یا تسویهٔ بدهی نیست. خروج نقد با دریافت POS مخلوط نشود.
- **شبکه‌های نسخهٔ اول = Instagram + Telegram**، همراه بلاگ سایت.

این پاسخ‌ها تعیین دامنهٔ پلن‌اند؛ **«شروع کن» محسوب نمی‌شوند.**

### یافته‌های بررسی ایستا که روی پلن اثر دارند

- API sync رزرو دادهٔ ناقص/نمونه و وضعیت همیشگی PENDING می‌دهد. CONFIRMED و REJECTED هر دو به check-in و هوک حضور می‌روند؛ باید از پرداخت/حضور/لغو تفکیک شود (E.102).
- شناسهٔ ایستگاه‌های سایت/مدیریت یکی نیست؛ نگاشت صریح لازم است. نتیجهٔ pointsOnly در تسویهٔ بعضی رزروها شناسهٔ result قبلی را جایگزین می‌کند؛ ارتباط مالی باید پایدار شود (E.104).
- کیف پول، موتور افیلیت، کاتالوگ/سفارش سایت، بلاگ و تورنمنت پایه وجود دارند؛ تب‌های جدید نباید بک‌اند موازی بسازند. Manus و صف انتشار جدیدند.

### پیشنهادهای پلن، نه تصمیم قبلی کاربر یا قابلیت انجام‌شده

- ۹ batch: قرارداد/دسترسی → دریافت و کیف پول → رزرو روی کارت → کافه/فروشگاه → افیلیت → کوپن/ساعات → تورنمنت → محتوا/Manus → رگرسیون/تحویل.
- Manus **API v2** در مستندات رسمی فعلی تأیید شد. پیشنهاد نشر: Manus برای محتوا، صف و تأیید نسخه در سرور سایت، Zernio برای Instagram/Telegram، بلاگ در خود بازینو. مستند نشر Zernio خوانده شد ولی مسیر نشر هنوز پیاده‌سازی/تست نشده؛ ماژول آن از PR/DM فعلی جدا باشد. استفاده از ربات Telegram ناشر/دادن مجوز، نیازمند اطلاع و اقدام مجاز مدیر است.
- پیش‌فرض پیشنهادی: براکت حذفی ساده، بهترین تخفیف مجاز بدون تجمیع خودکار، تأیید مدیر پیش از نشر و نگه‌داری صف روی سرور آنلاین. این‌ها پیشنهادهای قابل اصلاح پیش از اجرا هستند.
- POS فعلاً فقط **ثبت دستی صادقانهٔ دریافت اپراتور**؛ کنترل سخت‌افزار جزو این بسته نیست و منتظر مدل/SDK است. نقدکردن کیف پول بدون تأیید موجودی مرجع انجام نشود.

**وضعیت:** فقط بررسی کد/مستندات و تهیهٔ پلن؛ کد محصول، حساب‌ها و تنظیمات زنده دست نخورده‌اند. تست نرم‌افزار/Chromium یا ارسال واقعی به Manus/شبکه‌ها انجام نشده. ادامه پس از بررسی پلن و «شروع کن»؛ قواعد اجرای بی‌وقفه، تست واقعی و تحویل §۶ برقرارند.

---

## ۱۲. پلن تأیید شد؛ تصاویر POS بررسی شدند — هنوز شروع نکن

کاربر نوشت: **«پلن مورد تایید هست ولی قبل از شروع این تصاویر دستگاه POS را بررسی کن»** و هشت تصویر فرستاد. این تأیید پلن است، **نه دستور شروع پیاده‌سازی**. تا «شروع کن»، فقط بررسی/مستندسازی انجام شود.

### نتیجهٔ بررسی تصویر

- **تطابق بصری بسیار قوی با Ingenico Desk/2600**؛ شکل درپوش contactless، کی‌پد، علائم ناوبری و MagicBox با مراجع این مدل هم‌خوان‌اند. **MODEL/SKU از نوشتهٔ خوانای عکس قرائت نشده** و نسخهٔ برنامهٔ بانکی معلوم نیست.
- Türkiye İş Bankası روی بدنه دیده می‌شود؛ علاوه بر Maximum روی صفحه. صرف نام بانک کارت در رسید با بانک پذیرنده یکی فرض نشود.
- MagicBox با علائم **PSU / POS** و کابل آبی Ethernet متصل دیده شد. اتصال فیزیکی LAN به معنی فعال‌بودن ECR شبکه یا وجود REST API نیست.
- راهنمای رسمی **Desk/2600، §۴٫۲٫۳، صفحهٔ ۱۲** صریحاً USB-B Slave روی MagicBox را برای **cash register** معرفی می‌کند؛ §۴٫۲٫۴ نقش USB-A Host و §۴٫۲٫۵ برق/اتصال خود ترمینال را جدا می‌کند.
- این یافته مسیر سخت‌افزاری صندوق را مستند می‌کند، اما درایور/پروتکل/فعال‌سازی ECR در برنامهٔ İş Bankası برای KKTC هنوز نیازمند تأیید بانک/نصاب و تست است.
- رسید نمونه مشخصات فروش کارتی را دارد؛ `APP LABEL: Visa Debit` نسخهٔ برنامهٔ POS نیست. شناسه‌های مالی رسید در اسناد جدید بازنشر نشدند و عکس‌های کاربر به Git اضافه نشدند.

### مسیر بعدی

1. **نمای جلو، پایه و رسید دوباره درخواست نشود.** فقط MODEL/SKU و نسخهٔ بانکی از نوشتهٔ بیرونی/صفحهٔ اطلاعات عادی یا بانک/نصاب؛ قاب/باتری/پلمب باز نشود.
2. از İş Bankası/نصاب پشتیبانی **USB-B Slave ECR برای Desk/2600 با برنامهٔ KKTC**، نام/نسخهٔ پروتکل، SDK/درایور مناسب صندوق، فعال‌سازی، query بعد از timeout و تست خواسته شود. متن ترکی در گزارش هست و ارسال نشده است.
3. GMP3 مدل‌های iDE280/iWE280/MOVE5000F یا ثبت Microvise برای آن‌ها، تأیید پشتیبانی این Desk/2600 نیست. مدل محتمل TETRA است؛ اسناد iCT250/Telium 2 نیز مسیر این دستگاه انتخاب نشوند.
4. پلن نرم‌افزار مدیریت **تأیید شده** و می‌تواند پس از «شروع کن» اجرا شود؛ کنترل خودکار POS هنوز خارج از آن بسته و منتظر تأیید مستقل است.

گزارش کامل: **`docs/payments/POS_DEVICE_REVIEW.md`**؛ `POS_RESEARCH.md` نیز با یافتهٔ جدید اصلاح شد.

### مرز ابزار/اجرا

تصاویر در خود پیام دیده و بررسی شدند. `read_file` هشت مسیر `/home/user/uploads/…` را باز نکرد؛ پوشه/فایل در workspace موجود نبود و جست‌وجوی محلی هم پیدا نکرد. crop/OCR اصل فایل انجام نشده است. تصاویر مقایسه‌ای وب دریافت و با `read_file` باز شدند؛ متن کامل راهنمای Desk/2600 با ابزار وب خوانده شد. دانلود مستقیم بعضی فایل‌های رسمی خطای TLS/EOF داد؛ ادعای دانلود/رندر آن‌ها نمی‌شود.

هیچ کد محصول، SDK، تنظیمات شبکه/دستگاه، بانک یا انتشار محتوا تغییر نکرد. تست برنامه/Chromium، تراکنش یا تماس واقعی، commit/push و ZIP این نوبت انجام نشده است.

---

## ۱۳. ویندوز مشخص شد؛ پروتکل بانکی هنوز به دست نیامده

کاربر پرسید آیا با مشخصات/مستندات موجود می‌توان کد نوشت تا تست کند. پیشنهاد یک تستر مستقلِ شناسایی واقعی USB/COM + گزارش درایور + شبیه‌ساز واضح، بدون برداشت/تغییر حساب، مطرح شد. در ابزار سؤال:

- کاربر **Windows 10 یا 11** را انتخاب کرد؛ نسخهٔ دقیق/معماری معلوم نیست.
- به جای گزینهٔ «شروع کن؛ نسخهٔ تست POS»، پاسخ نوشت: **«مگه پرو توکل را از مستندات با تحقیق بر روی وب نتوانستی بدست بیاری»**. این سؤال، **تأیید تستر یا مجوز شروع نیست**.

پاسخ باید صریح و بدون اغراق باشد: **پروتکل فرمان فروشِ Desk/2600 با برنامهٔ İş Bankası در KKTC هنوز به دست نیامده است.** سند USB-B معرفی رابط فیزیکی است؛ GMP3 برای مدل‌های مالی دیگر یافت شده و انطباقش با این نصب تأیید نشده. «مسیر سخت‌افزاری مستند» را به «SDK/پروتکل بانک پیدا شد» تبدیل نکنید.

جست‌وجوی تکمیلی ECR/SDK/ZVT برای نام‌های Desk2600/Desk 2600 و واژه‌های ترکیِ بانک/صندوق انجام شد؛ سند منطبقِ فرمان/پاسخ این برنامه پیدا نشد. نتایج سخت‌افزاری، فروشگاهی، درگاه آنلاین و AWS ECR به‌جای پروتکل انتخاب نشدند. `desktop-app` بررسی شد؛ آداپتور POS موجودی در preload حداقلی پیدا نشد.

**وضعیت:** نه تستر نوشته/تأیید شده، نه کد اصلی شروع شده، نه تست/تراکنش/نصب SDK انجام شده. پلن اصلی همچنان تأییدشده و منتظر شروع است. برای اتصال واقعی باید نام/نسخهٔ ECR یا SDK ویندوزِ همان برنامه مشخص شود؛ شبیه‌ساز و enumeration دستگاه، اثبات فروش بانکی نیست. گزارش به‌روز: `docs/payments/POS_DEVICE_REVIEW.md §۸`.


## ۱۴. دستور اجرای پلن مدیریت — POS فعلاً کنار گذاشته شد

کاربر صریحاً گفت: «باشه پس این مورد را فعلا کنار بزار و پلن تغییرات نرم افزار مدیریت را که تایید کردم اجرا کن». این **دستور شروع اجرای پلن تأییدشده** است؛ نیاز به تکرار کلمهٔ خاص یا تأیید مجدد نیست. همهٔ batchها بی‌وقفه اجرا شوند و فقط گزارش نهایی کوتاه ارائه شود. پژوهش/تستر/کنترل سخت‌افزاری POS تا دستور جدید متوقف است؛ ثبت دستی دریافت POS در صندوق جزو پلن باقی می‌ماند.

تست واقعی بیرونی Manus/Zernio بدون کلید/اتصال مجاز یک وابستگی جداست؛ کار مستقل تکمیل شود و نتیجهٔ شبیه‌ساز با سرویس زنده مخلوط نشود. لاگ اجرا و مرز تست‌ها: `docs/management/EXECUTION_LOG.md`.

---

## ۱۵. بازبینی تاریخی کد پس از PR #18 — وضعیت پیش از تکمیل بچ‌های بعدی

> **این بخش تاریخچه است، نه وضعیت فعلی.** گزارش زیر مربوط به بازبینی پایهٔ PR #18 در 2026-09-06 است. پس از PR #19، کد و رابط batchهای ۶–۸ و توسعه‌های بعدی موجودند؛ برای ادامه **بخش ۱۶** ملاک است. فهرست §۱۵٫۳ و دستور ادامهٔ §۱۵٫۵ نباید باعث ساخت دوبارهٔ قابلیت‌ها یا کار روی شاخهٔ تاریخی شوند. متن قدیمی برای حفظ سابقه نگه داشته شده است.

> نشست `arena/01a07603-bazino-gamenet-portal` · ۱۴۰۵/۰۶/۱۵ (2026-09-06).
> کاربر خواست **کد (نه فقط اسناد)** برنچ `arena/01a070af-bazino-gamenet-portal` بررسی و وضعیت واقعی هر بند درخواست مشخص شود، سپس همین هندآف بر اساس کد به‌روزرسانی شود.
> **وضعیت برنچ:** ۵ کامیت اجرای پلن (`8be8db1` → `3fd8a7d`) با **PR #18 در `main` ادغام شدند** (`81f9b84`). برنچ این نشست پس از merge از روی `main` تازه بازسازی شد (پایه `81f9b84`) و فقط به‌روزرسانی همین سند را دارد — پس کد زیر در `main` هم موجود است. تأیید پوشهٔ `node_modules`/بازاجرای تست در این نشست انجام **نشده** (وابستگی‌ها بین پیام‌ها پاک می‌شوند؛ بخش ۰)؛ یافته‌های زیر از بازبینی مستقیم کد و سوئیت `tests/management.test.mts` است و نتایج تستِ گزارش‌شده متعلق به اجرای نشست قبل طبق `EXECUTION_LOG.md` است.

### ۱۵٫۱ بندهای درخواست کاربر و وضعیت واقعی در کد

| # | بند درخواست | وضعیت | محل کد |
|---|---|---|---|
| ۱ | رزرو آنلاین روی **همان ایستگاه** + ساعت شروع/پایان + وضعیت قطعی/پرداخت‌نشده | ✅ کامل | `shared/management/Stations.tsx` → `StationReservations` (روی کارت ایستگاه در `Management App/Bazino/src/App.tsx:~800` با `bookings={bookingGroups[station.id]}`)؛ بک‌اند `server/management/bookings.ts` (`bookingViews`, `assertStationFree`). بج‌های «قطعی — پرداخت‌شده / رایگان / در انتظار پرداخت» بر اساس وضعیت سفارش (`settled` = قطعی)، نه check-in. دکمه‌های «ثبت حضور / شروع از رزرو / دریافت وجه» و عبور از نیمه‌شب پشتیبانی می‌شود. نگاشت یک‌به‌یک ایستگاه↔سیستم سایت با قید یکتایی `station:<systemId>` (`StationRegistry` در `shared/management/Registry.tsx`). |
| ۲ | تب کافه و تب فروشگاه با سفارش آنلاین/حضوری + مشخص‌بودن ایستگاه مرتبط | ✅ کامل | `shared/management/Orders.tsx` → `OrdersConsole` (تب `buffet`→`kind="cafe"`، تب جدید `shop`→`kind="shop"` در `App.tsx:814-815`؛ تب «فروشگاه» در `Header.tsx:337`). سه زیرتب: صف سفارش‌ها / ثبت سفارش حضوری / کاتالوگ و موجودی. فیلتر منبع (آنلاین/حضوری/قدیمی) و ایستگاه، انتخاب «ایستگاه تحویل» و «افزودن طلب به سانس» (`attach`). بک‌اند `server/management/orders.ts`. **همین کنسول در پنل ادمین سایت هم استفاده می‌شود:** `src/components/AdminPanelTab.tsx:2799/2801` (`cafe`/`shop` با `OpsProvider`). |
| ۳ | تب همکاری در فروش + شارژ کیف پول و تسویهٔ حضوری | ✅ کامل | `shared/management/Affiliates.tsx` → `AffiliateConsole` (تب «همکاری در فروش» با گیت `can('affiliates')` در `Header.tsx:350`): CRUD همکار، نرخ‌های ارث‌بری (new/return/tournament/override)، تأیید/رد کمیسیون، ثبت معرف حضوری (`affiliate-attach`)، کیف پول همان همکار. بک‌اند `server/management/affiliates.ts` (روی موتور موجود `server/affiliate/`، بدون موتور موازی). کیف پول: `shared/management/Wallet.tsx` → `WalletConsole` (تب «اعضا و کیف پول»)؛ بک‌اند `server/management/finance.ts`. پنل سایت: `/admin/wallet` (`AdminWalletSection.tsx` حالا فقط wrapper همان `WalletConsole`) و کیف پول داخل جزئیات همکار (`AdminAffiliatesSection.tsx:194`). |
| ۴ | همهٔ پرداخت‌ها فقط با دو گزینهٔ نقدی / دستگاه POS | ✅ کامل | `shared/management/Payment.tsx` → `PaymentDialog` برای **همهٔ** دریافت‌های حضوری (رزرو، سفارش کافه/فروشگاه، شارژ کیف پول) فقط دو دکمه `cash`/`pos` دارد (`data-ops-method`)؛ POS = **ثبت دستی صادقانه با تأیید اپراتور** + فیلد مرجع رسید، بدون فرمان به دستگاه (`posMode:'manual'` در `/api/management/me`). رسید `ReceiptView` با `confirmation: operator_cash | operator_pos_manual`؛ روش سوم/قدیمی در `finance.ts` رد می‌شود (`cashMethod`). نقدکردن دو مرحله‌ای: رزرو وجه (`cashout_hold`) → تأیید تحویل نقد؛ لغو پیش از تحویل با برگشت مبلغ. |
| ۵ | بخش سوشیال مدیا/بلاگ با **API Manus** + صف انتشار (در مدیریت و پنل سایت) | ❌ **کد نشده** | هیچ آداپتور Manus در کد نیست (`grep -ri manus` فقط در اسناد پلن/هندآف نتیجه می‌دهد). تایپ `OpsTab` مقدار `'content'`، مجوزهای `'content'/'publish'` و اینترفیس `ContentItem` (draft→generating→review→approved→scheduled→published/failed) در `shared/management/types.ts` **فقط تعریف شده‌اند**؛ هیچ کامپوننت، روت `/api/management/content*` یا دکمه‌ای در `Header.tsx`/`App.tsx` وجود ندارد. در `ADMIN_SECTIONS` سایت (`src/utils/routes.ts`) هم بخش `content`/`promotions` اضافه نشده. |
| ۶ | مدیریت کوپن تخفیف + ساعات رایگان/نیم‌بها (در مدیریت و پنل سایت) | ❌ **کد نشده** | مجوز `'promotions'` فقط در تایپ و گیت `canGiveDiscounts: can('promotions')` (`App.tsx:91`) هست؛ تب `promotions` در UI رندر نمی‌شود و هیچ روت/کامپوننت CRUD کوپن یا تعریف ساعات ویژه ساخته نشده. کوپن موجود فقط در رزرو/تسویه **اعمال/مصرف** می‌شود (`validateCouponServerSide` در `server.ts`، فیلد `couponCode` در فرم سفارش)؛ بخش «مدیریت» کوپن‌ها و موتور قطعه‌ای رایگان/نیم‌بها (معیار پذیرش ۱۲) وجود ندارد. |
| ۷ | بخش مدیریت مسابقات (تورنومنت) در نرم‌افزار مدیریت | ❌ **کد نشده** | در `shared/management/` و بک‌اند `server/management/` کلمهٔ tournament فقط به‌صورت «درصد کمیسیون مسابقه» (افیلیت) و دسته‌بندی گزارش‌ها (`Reports.tsx`/`reports.ts`: `tournament: 'ورودی مسابقه'`) هست. تایپ `OpsTab` مقدار `'tournaments'` را دارد ولی در `Header.tsx`/`App.tsx` تب و کنسولی رندر نمی‌شود؛ براکت/BYE، حضور، ثبت نتیجه و تخصیص ایستگاه (batch 7 پلن) پیاده نشده. **پنل ادمین سایت** بخش قدیمی تورنومنت را دارد (`/admin/tournaments`: ساخت/حذف تورنومنت و تعداد تیم‌ها) ولی تکمیل/بازاستفادهٔ آن در اپ مدیریت انجام نشده. |

### ۱۵٫۲ زیربنای اضافه‌شده در batchهای ۱–۵ (برای ادامهٔ کار)

- **API واحد مدیریت:** `/api/management/*` (`server/management/routes.ts`): ورود JWT واقعی (`/login`, `/me`, `/bootstrap`)، نگاشت ایستگاه‌ها (`/stations/import`)، مدیریت دسترسی کارکنان (`/access`)، حسابرسی (`/audit`). رکوردهای عملیاتی نسخه‌دار (`OpsRecord` با CAS/`VERSION_CONFLICT`)، فرمان‌های اتمیک با `idempotencyKey` (`IDEMPOTENCY_CONFLICT`)، تراکنش بومی در سه پروایدر و سری‌کردن دسترسی SQLite (`server/management/core.ts`).
- **مجوزهای کارکنان** (`OpsPermission`): `reservations, orders, collect, wallet, cashout, affiliates, promotions, content, publish, tournaments, reports, configure` — سه مورد آخر (`promotions, content, publish, tournaments`) برای batchهای ۶–۸ رزرو شده‌اند ولی هنوز UI ندارند.
- **سانس‌های ایستگاه:** `server/management/sessions.ts` + `Stations.tsx` (`StartSessionDialog`, `SessionCheckout`): شروع/پایان/pause/resume/انتقال/تغییر تعرفه/تمدید روی بک‌اند؛ بازهٔ پوشش‌داده‌شده توسط رزرو پرداخت‌شده دوباره دریافت نمی‌شود (quote در زمان صورتحساب).
- **کامپوننت‌های مشترک دو پنل:** پوشهٔ `shared/management/` (`context.tsx` با `OpsProvider`/`useOps`/`useResource`، `styles.css`) هم در اپ مدیریت (`Management App/Bazino` با base `/management-app/`) و هم در پنل ادمین سایت استفاده می‌شود؛ اپ مدیریت دیگر صف localStorage قدیمی (`WebWalletPanel`) را منبع تأیید نمی‌کند (موجودی از دفترکل سرور).
- **گزارش صندوق:** `server/management/reports.ts` + `shared/management/Reports.tsx` — فروش را از شارژ کیف پول و تحویل نقد تفکیک می‌کند (دسته‌ها: reservation/session/tournament/cafe/shop)، CSV و رسید قابل چاپ.

### ۱۵٫۳ کارهای باقی‌مانده (به ترتیب batchهای پلن — مرجع: `docs/management/EXPANSION_PLAN.md`)

- **batch 6 — کوپن و ساعات ویژه (در هر دو پنل):** CRUD مشترک کوپن با مالک/سقف/انقضا (معیار ۱۱: کوپن منقضی/سقف‌پر/متعلق به دیگری رد شود؛ مصرف هم‌زمان آخرین سهمیه ممکن نباشد)، تعریف ساعات رایگان/نیم‌بها و محاسبهٔ قطعه‌ای فاکتور (معیار ۱۲)، تب `promotions` در `Header.tsx`/`App.tsx` و بخش جدید در `ADMIN_SECTIONS` سایت.
- **batch 7 — تورنومنت‌ها:** کنسول `TournamentConsole` (ثبت‌نام و پرداخت، حضور، براکت با BYE، ثبت نتیجه، زمان/ایستگاه مشترک بدون تداخل — معیار ۱۷)، تب `tournaments` در اپ مدیریت؛ بازاستفاده از دادهٔ موجود تورنومنت سایت.
- **batch 8 — محتوا، Manus و صف انتشار (در هر دو پنل):** آداپتور **Manus API v2** (`POST https://api.manus.ai/v2/task.create` با هدر `x-manus-api-key` فقط سمت سرور؛ Tasks/Files/Webhooks/Structured Output — جزئیات در `EXPANSION_PLAN.md §9`)، چرخهٔ محتوا (پیش‌نویس→تولید→بازبینی→تأیید→زمان‌بندی→انتشار)، نشر بلاگ در خود بازینو و Instagram/Telegram از طریق Zernio (ماژول جدا از PR/DM فعلی؛ نیازمند کلید/اجازهٔ معتبر)، صف پایدار سمت سرور، webhook امن (معیارهای ۱۴–۱۶: پیش‌نویس عمومی نشود؛ webhook نامعتبر/تکراری نشر نکند؛ موفقیت/شکست هر کانال جدا ثبت شود). تب `content` در اپ مدیریت + بخش جدید در ادمین سایت.
- **batch 9 — رگرسیون و تحویل نهایی:** اجرای کامل سوئیت تست با مراحل بخش ۰ (نصب `--ignore-scripts` + rebuild دستی `better-sqlite3`)، بازبینی بصری Chromium واقعی برای تب‌های جدید (قاعدهٔ ۱۲)، به‌روزرسانی اسناد و ZIP تحویلی.

### ۱۵٫۴ مرز تست در این نشست

- یافته‌ها از **بازبینی ایستای کد** است؛ سرور زنده، تست واحد و Chromium در این نشست اجرا نشدند. سوئیت `tests/management.test.mts` (۲۲ تست: رولبک بومی، رقابت نقدکردن، تکرار درخواست، حفظ `reservationId`، تخصیص یک‌بار کالا، نگاشت ایستگاه، مرز شبانه و…) طبق `EXECUTION_LOG.md` در نشست قبل سبز بوده (۲۲/۲۲ core/SQLite + TypeScript و build مدیریت).
- ادعاهای تست‌نشدهٔ قبلی پابرجا: تراکنش واقعی بانکی/POS، PayTR/درگاه آنلاین (خاموش می‌ماند)، SMTP/ایمیل (متوقف)، مصرف اعتبار زندهٔ Manus/Zernio، اجرا روی SQL Server/Mongo.

### ۱۵٫۵ قاعدهٔ ادامهٔ کار

- ادامهٔ batchهای ۶–۸ همچنان تابع **قانون ۱ (§۵٫۵)** است: پلن تأییدشده (`EXPANSION_PLAN.md`) و دستور شروع قبلی معتبر است؛ اگر کاربر صریحاً «ادامه/شروع کن» را برای باقی‌مانده گفت، بی‌وقفه تا batch 9 اجرا شود. POS سخت‌افزاری تا دستور جدید متوقف می‌ماند (§10–§13).
- قاعدهٔ برنچ این نشست: کار و push فقط روی برنچ ردیابی‌شدهٔ همان نشست (`arena/01a07603-bazino-gamenet-portal`) انجام شود. کد نشست `arena/01a070af-…` با PR #18 در `main` ادغام شده؛ برنچ این نشست روی همان پایه (`81f9b84`) بازسازی شده و ادامهٔ batchهای ۶–۸ از همین برنچ انجام می‌شود (شروع از `main` تازه، بدون کامیت تکراری کد).

---

## ۱۶. وضعیت واقعی پروژه (به‌روزرسانی پس از مرج PR #19)

> **ثبت‌شده به درخواست کاربر در ۱۴۰۵/۰۶/۱۶ (2026-09-07).** این بخش متن وضعیت ارسالی کاربر را با قالب‌بندی و مسیرهای دقیق فایل/API ثبت می‌کند. نتایج اجرا و تستِ نقل‌شده، سوابق نشست قبل‌اند؛ در نوبت افزودن این متن، فقط مستندات ویرایش شدند و تست، بیلد، انتشار یا تماس زنده‌ای انجام نشد. محدودیت‌ها و تفاوت گزارش با راستی‌آزمایی فعلی در §۱۶٫۳ آمده‌اند.

همهٔ بچ‌های پلن مدیریت و امکانات جدید، کد و رابط کاربری دارند و در `main` مرج شده‌اند:

- **بچ ۱–۵** (رزرو روی ایستگاه، کافه/فروشگاه، افیلیت + کیف پول، نقدی/POS) → **PR #18**.
- **بچ ۶–۹** (کوپن/ساعات ویژه، تورنومنت، محتوا/صف انتشار با Manus، تست/تحویل) → همان سری برنچ‌ها؛ کد و گزارش اجرا در نسخهٔ مرج‌شده موجود است. مرز تست و تحویل، مطابق گزارش اجرای بچ ۹ و §۱۶٫۳ است.
- **بچ ۱۰–۱۳** → **PR #19**، merge commit **`47021330`** (کامل: `4702133077bdacc478982b8ec0ad1778906fb379`).

**هیچ‌کدام از این بخش‌ها را از نو نسازید؛ کار باقی‌مانده «تکمیل شکاف‌ها و راستی‌آزمایی زنده» است.**

### ۱۶٫۱ موارد جدید انجام‌شده (بچ ۱۰–۱۳)

#### بچ ۱۰ — تورنومنت عمومی/زنده

- فصول ۴گانه (بهار/تابستان/پاییز/زمستان) با امتیاز رتبه‌بندی: هفتگی **۵/۲/۱**، ویژه **۱۰/۴/۲**؛ امتیاز فصل فقط برای رتبه‌بندی است و جدا از اعتبار خرید (**Credits**).
- فصل و متادیتای تورنومنت روی **OpsRecord** ذخیره می‌شود (بدون مهاجرت اسکیمای ۳ پرووایدر).
- پیرینگ دستی زنده روز مسابقه (**BYE** خودکار، سقف **۳۲**، رد تیم تکراری)، صعود خودکار برنده با ثبت نتیجه، پخش براکت با **SSE + پولینگ ۵ ثانیه‌ای**، حالت تلویزیون/تمام‌صفحه (کیوسک).
- صفحهٔ عمومی جدید `src/components/tournaments/EventsTab.tsx` با تب‌های: **هفتگی (کارت کامل) / ویژه (فقط اطلاع‌رسانی) / رتبه‌بندی فصل / براکت زنده + حالت تلویزیون / ثبت‌نام** — با همان تم فعلی Arena؛ **Home دست‌نخورده**.
- برنامه‌ریز ادمین سایت `src/components/admin/AdminTournamentPlanner.tsx` (نوع هفتگی/ویژه، وضعیت ثبت‌نام، قوانین، جوایز) و کنسول مدیریت `shared/management/Tournaments.tsx` (پیرینگ دستی، متادیتا، نهایی‌سازی/امتیاز فصل، جدول فصل).
- اندپوینت‌های عمومی، با مسیر دقیق پارامترها:
  - `GET /api/tournaments/events`
  - `GET /api/tournaments/cards/:kind`
  - `GET /api/tournaments/:id/live`
  - `GET /api/tournaments/:id/rules`
  - `GET /api/season-ranking`
  - `GET /api/player/tournament-stats`
  - SSE: `GET /api/tournaments/:id/stream`

#### بچ ۱۱ — پیامک Messaggio

- درایور `server/sms/index.ts` با `SMS_PROVIDER=messaggio`؛ هدر `Messaggio-Login: $MESSAGGIO_PROJECT_LOGIN` و کد فرستندهٔ `sms.from = $MESSAGGIO_SENDE_CODE`؛ شماره به رقم با کد کشور تبدیل می‌شود.
- fallback سکرت برای **`MANUS_API_KEY`** و **`ZERNIO_API_KEY`** اضافه شد.
- نام متغیر **`MESSAGGIO_SENDE_CODE`** مطابق کد فعلی است؛ املای آن در تنظیمات هاست خودسرانه تغییر نکند.

#### بچ ۱۲ — پیام‌رسانی گروهی تبلیغاتی

- `server/management/messaging.ts` + ساب‌تب **«پیامک گروهی»** (`src/components/admin/AdminMessagingPanel.tsx`): کمپین روی **SMS / Viber / WhatsApp** از طریق Messaggio؛ مخاطبِ تأییدشده با OTP + شمارهٔ دستی؛ کانال بدون کلید = حالت شبیه‌ساز (**SIM**)؛ تاریخچهٔ کمپین.
- واتساپ خارج از پنجرهٔ **۲۴ساعته** به قالب تأییدشده (**template**) نیاز دارد.

#### بچ ۱۳ — دعوت اینستاگرامی Manus + سیستم توکن استاندارد

- **`POST /api/integrations/instagram/partner-invite`**: Manus **«Instagram account id» شریک** را می‌فرستد (**نه media id پست/ریل**) و **«کد یکتا + لینک دعوت امضاشده با HMAC»** می‌گیرد؛ idempotent per **(کمپین، اکانت)**. دوست با بازکردن لینک وارد گیت می‌شود و پس از ثبت‌نام، طبق قواعد گیت/کوپن موجود، کوپن می‌گیرد.
- سیستم توکن استانداردِ قابل جایگزینی/ابطال در پنل **`/admin/affiliates`** (بخش **«توکن‌های دسترسی»**): **ساخت / کپی بدون نمایش / تغییرنام / حذف** توکن (فرمت **`baz_<hex>`**)؛ مسیرهای **`/api/admin/api-tokens`**؛ یک توکن هم برای Manus (**Bearer**) و هم برای وب‌هوک Zernio (**جایگزین HMAC**) معتبر است.
- شرح کامل: [docs/payments/AFFILIATE-IG.md](docs/payments/AFFILIATE-IG.md)، **فاز ۳**.

### ۱۶٫۲ موارد باقی‌ماندهٔ اعلام‌شده توسط کاربر (زیرساختی/تأیید زنده — نه ساخت بخش جدید)

> این فهرست، کارهای زیرساختی و اتصال زندهٔ متن ارسالی است؛ به معنی نبود شکاف کد یا تکمیل همهٔ معیارهای پذیرش نیست. موارد بازبینی فنی و تست، جداگانه در §۱۶٫۳ حفظ شده‌اند. سکرت‌ها فقط از مسیر امن تنظیمات هاست/سرویس ثبت شوند؛ نه در چت، Git یا فایل عمومی. ثبت این چک‌لیست مجوز ارسال پیام، انتشار یا مصرف اعتبار سرویس نیست.

1. **سکرت‌های هاست (متغیر محیطی):**
   - پیامک: **`SMS_PROVIDER=messaggio`**، **`MESSAGGIO_PROJECT_LOGIN`**، **`MESSAGGIO_SENDE_CODE`**.
   - وایبر/واتساپ (برای پیام گروهی): **`MESSAGGIO_VIBER_CODE`**، **`MESSAGGIO_WHATSAPP_CODE`**.
   - خروجی زرنیو (هر وقت آماده شد): **`ZERNIO_API_KEY` + `ZERNIO_IG_ACCOUNT_ID`**، به‌علاوهٔ **`ZERNIO_WEBHOOK_SECRET`** در پروداکشن.

2. **برای Manus:**
   - از پنل **`/admin/affiliates`** یک **«توکن دسترسی»** بسازید و در تنظیمات Manus به‌صورت **`Authorization: Bearer baz_…`** بگذارید.
   - **`ig_invite_base_url`** را روی دامنهٔ نهایی **`https://bazino.pro`** تنظیم کنید.
   - پرامپت آمادهٔ API (**partner-invite**) با آدرس **`https://bazino.pro`** در اختیار تیم Manus قرار گیرد.
   - طبق بخش ستاره‌دار `HANDOFF_CONTINUE_HERE.md`، فعلاً مدیریت زرنیو به Manus سپرده شده و برای فراخوانی همین API پورتال، توکن پنل کافی است. این توکن با کلید تولید محتوا در Manus یکی نیست و به‌تنهایی تأیید اتصال مستقیم پورتال به Zernio محسوب نمی‌شود.

3. **تأیید تماس‌های زنده:**
   - ارسال واقعی پیامک **Messaggio** (یک OTP واقعی).
   - **PR / DM / follow-status** واقعی **Zernio**.
   - فراخوانی واقعی **Manus → partner-invite** با توکن پنل.
   - همهٔ این تماس‌ها در گزارش سندباکس **untested** هستند؛ تست آداپتور/شبیه‌ساز، جای تماس زنده را نمی‌گیرد.

4. **تست در محیط با شبکه:**
   - **`npm ci`**، سپس کل سوئیت. در گزارش نشست قبل، دانلود هدرهای Node از `nodejs.org` برای بیلد nativeِ `better-sqlite3` مسدود بود. **این وابستگی اجباری به دانلود نیست:** مسیر جایگزینِ نصب با `--ignore-scripts` و rebuild با هدرهای محلی (`--nodedir=/usr/local`) در بخش‌های **۰ و ۲** مستند شده و باید با نسخه/هدرهای همان محیط تطبیق داده شود؛ بدون آزمودن آن، اجرای سندباکس «ناممکن» اعلام نشود.
   - آخرین نتایج ثبت‌شده پیش از پاک‌شدن `node_modules`:
     - مدیریت **۴۱/۴۱**، واحد **۹۹/۹۹**، دیتابیس **۳۸/۳۸**، پرووایدر **۲۷/۲۷**، UI **۴۲/۴۲**.
     - API **۱۴۷/۱۶۹**؛ **۲۲ شکست** در گزارش قبلی به‌عنوان «از قبل موجود روی main و نامرتبط با این تغییرات» ثبت شده‌اند. این نسبت‌دادن، نقل گزارش قبلی است و در نشست جاری مستقلاً بازتولید نشده است؛ کل سوئیت سبز نیست.
   - طبق همان گزارش: **`tsc` صفر خطا**؛ build سایت (**Vite**) + اپ مدیریت + باندل سرور (**esbuild**) موفق.
   - این نتایج، اجرای تازهٔ تست پس از همهٔ تغییرات نیستند؛ پس از تغییرات نهایی بچ ۱۳، اجرای کامل مجدد همچنان لازم است.

5. **پروندهٔ سخت‌افزار POS** همچنان **متوقف** است تا دستور جدید. ثبت دستی دریافت POS جزو امکانات فعلی باقی می‌ماند؛ این ثبت، اتصال یا تراکنش بانکی خودکار نیست.

**مرجع جزئیات اجرایی:** [docs/management/EXECUTION_LOG.md](docs/management/EXECUTION_LOG.md) و [HANDOFF_CONTINUE_HERE.md](HANDOFF_CONTINUE_HERE.md)، بخش ستاره‌دار بالای سند. عبارت‌های قدیمی این اسناد دربارهٔ «مرج در انتظار»، نام برنچ یا محدودیت قطعی محیط، با وضعیت فعلی و راهنمای فنی همین هندآف تطبیق داده شوند.

### ۱۶٫۳ مرز گزارش، شکاف‌های باز و قاعدهٔ ادامه

- **وجود کد با تأیید تکمیل برابر نیست.** در بازبینی ایستای پیام قبلی این نشست، مواردی برای تکمیل/آزمون ثبت شد: اعمال `perUserMax` و `startsAt` کوپن در مسیر خرید؛ کلید یک‌باراجرایی مسیرهای غیرفعال‌سازی کوپن/ساعات ویژه؛ یکسانی قیمت سایت/مدیریت و دقت مرز ساعات ویژه (محاسبهٔ فعلی سانس با گام پنج‌دقیقه‌ای). مراجع کد: `server/management/promotions.ts`، `server/management/sessions.ts` و `validateCouponServerSide` در `server.ts`. این موارد با اضافه‌کردن متن حاضر رفع نشده‌اند و بازنویسی بخش از صفر هم لازم نیست.
- **محتوا/اتصال بیرونی نیازمند تطبیق است:** قرارداد وب‌هوک Manus در `EXPANSION_PLAN.md §۹` مبتنی بر `RSA-SHA256` ثبت شده، ولی `server/management/content.ts` از HMAC استفاده می‌کند؛ تأیید همان نسخهٔ محتوا، جلوگیری از انتشار تکراری، بازیابی صف و قرارداد نشر واقعی شبکه‌ها نیز باید با تست تأیید شوند. این موضوع از لینک دعوت HMAC و توکن Bearer بچ ۱۳ جداست؛ اضافه‌شدن `partner-invite` به معنی رفع مسائل آداپتور تولید/نشر نیست.
- **بازبینی بصری تازه انجام نشده است.** طبق گزارش بچ ۹، Chromium و تصاویر واقعی مراحل جدید ارائه نشده‌اند. قاعدهٔ ۱۲ پابرجاست: مرورگر واقعی، فونت فارسی/RTL، موبایل و دسکتاپ، اسکرین‌شات تمام‌صفحه و مشاهدهٔ خود تصاویر؛ راه‌اندازی جایگزین Chromium از npm در بخش ۳ موجود است. اسموک HTTP یا تست UI داخلی، جانشین این بازبینی نیست.
- **کارهای قبلیِ مستقل همچنان جدا هستند:** تست واقعی SQL Server/Mongo، Flutter/Electron، ماندگاری استقرار و کارایی دامنهٔ واقعی، وابستگی نقشهٔ OpenStreetMap و تحویل نهایی، بدون شاهد تازه «انجام‌شده» اعلام نشوند. SMTP/ایمیل تا دستور صریح متوقف و PayTR بدون حذف، خاموش می‌ماند.
- **این درخواست فقط ثبت مستندات بود.** اجرای اصلاحات محصول همچنان تابع پلن و تأیید کاربر (§۵٫۵) است؛ هیچ مجوز تازه‌ای برای تغییر کد، انتشار، پیامک/تراکنش واقعی یا مصرف اعتبار از این الحاق برداشت نشود. کار و push فقط روی **`arena/01a07a2f-bazino-gamenet-portal`** انجام شود؛ هیچ بخش مرج‌شده‌ای دوباره از صفر ساخته نشود.

---

## ۱۷. ZIP گیرندهٔ Zernio استخراج شد — پلن ادغام و پاسخ مدیریت سکرت‌ها

> **سابقهٔ طرح ZIP پیش از درخواست جدید Media-ID-only.** برای کار جاری، بخش ۱۸ مقدم است؛ رفتار کمپین این بخش بدون دریافت/تطبیق سند تازه اجرا نشود.

> ۱۴۰۵/۰۶/۱۶ (2026-09-07) · کاربر فایل `bazino-affiliate-webhook.zip` را روی شاخهٔ همین نشست بارگذاری کرد و **پاسخ همراه پلن استقرار** خواست. این نوبت مرحلهٔ بررسی/برنامه‌ریزی است، نه شروع کدنویسی یا استقرار.

- ورودی با کامیت کاربر **`dfac97c`** وارد شد؛ تغییر آن فقط ZIP است. شاخهٔ `arena/01a07a2f-bazino-gamenet-portal` از `343540f` با **fast-forward** به آن رسید؛ هیچ reset یا جابه‌جایی شاخه انجام نشد.
- ZIP پس از کنترل مسیر/نوع/حجم، در `/home/user/reviews/bazino-affiliate-webhook-dfac97c` استخراج شد: **۱۲۸ فایل، ۸۳۳٬۵۹۵ بایت بازشده**؛ روی ریشهٔ برنامه باز نشد و هیچ کد/تست/اسکریپت آن اجرا نشد. SHA-256 و یافته‌ها در پلن ثبت‌اند.
- بسته یک پروژهٔ مستقل React/Express/tRPC/MySQL/Manus است، نه ماژول آمادهٔ جایگزینی بک‌اند بازینو. هستهٔ موردنیاز: `server/zernioWebhook.ts` و `server/bazinoAffiliate.ts`؛ وابستگی MySQL/پنل و ورود مستقل/فایل build وارد پروژه نشوند.
- **درخواست صریح:** گیرنده، `ZERNIO_WEBHOOK_SECRET` را از env هاست بخواند. نام حساب ZIP (`ZERNIO_ACCOUNT_ID`) با نام فعلی پروژه (`ZERNIO_IG_ACCOUNT_ID`) باید یکسان‌سازی شود؛ شناسه‌های هاردکد ZIP منبع مجوز نیستند.
- **پاسخ سؤال پنل:** بله، مدیریت سکرت‌ها در پنل قابل ساخت است؛ فقط از API ادمین اختصاصی، ذخیرهٔ رمزگذاری‌شده و خروجی masked. افزودن Secret به مسیر عمومی فعلی settings امن نیست. طرح پیشنهادی: env اولویت دارد، در نبود آن DB رمزگذاری‌شده؛ کلید اصلی پیشنهادی `BAZINO_SECRETS_KEY` خارج از DB روی هاست/secret manager می‌ماند. پنل/این کلید هنوز پیاده نشده‌اند.
- **رفتار ZIP از Friend Gate قدیمی متمایز است:** «آماده» → PR کد؛ کد دوست → PR لینک. خود ZIP فالو را تأیید نمی‌کند. شرایط کوپن/کمیسیون و سازگاری جریان قدیمی، ثبت اتمیک/عدم ارسال تکراری، فیلتر حساب/پست و پایداری کلید امضای دعوت‌های قبلی در پلن لحاظ شده‌اند.
- **نشانی هدف پس از استقرار:** `POST https://bazino.pro/api/webhooks/zernio`؛ health پیشنهادی `GET /api/webhooks/zernio/health`. مسیر فعلی `/api/integrations/zernio/webhook` با پردازش/دفتر ثبت مشترک حفظ می‌شود؛ دو پردازشگر یا اشتراک موازی برای همان کمپین ایجاد نشود. **این URL هنوز به‌عنوان استقرار واقعی تأیید نشده است.**
- مسیر انتشار موجود `.github/workflows/deploy.yml` (Railway، push به main یا اجرای دستی) بررسی شد؛ اعتبارها، فعال‌بودن Auto-Deploy و استقرار واقعی بررسی/استفاده نشدند. سبزبودن workflow به‌تنهایی اثبات اتمام deploy نیست.
- **مرجع پلن و معیارهای پذیرش:** [docs/payments/ZERNIO_RECEIVER_PLAN.md](docs/payments/ZERNIO_RECEIVER_PLAN.md). پیشنهاد شامل ادغام در Express/دیتابیس فعلی، HMAC/raw body، صف پایدار، سازگاری کمپین، پنل امن Zernio، تست و تحویل است. تأیید/دستور شروع لازم است؛ هیچ کد محصول، تنظیم هاست، اشتراک Zernio، پیام واقعی یا workflow در این نوبت تغییر/اجرا نشده است.

---

## ۱۸. سابقهٔ بازگشت به Media-ID-only و مانع پیوست (رفع‌شده با متن پیام بعدی)

> **مانع این بخش دیگر باز نیست:** در بخش ۱۹، کاربر متن کامل را مستقیماً فرستاد و فایل مرجع ذخیره شد. گزارش زیر شرح نوبت قبلی است؛ از کاربر دوباره همان سند درخواست نشود.

> ۱۴۰۵/۰۶/۱۶ (2026-09-07). کاربر خواست سند جدید افیلیت در ریپو ذخیره و از این هندآف به آن ارجاع داده شود؛ سپس پلن بازگشت به «Manus فقط شناسهٔ پست/ریل منتشرشده» و به‌روزرسانی گیرنده بر اساس همان سند ارائه شود. این نوبت مرحلهٔ مستندسازی/پلن است؛ اجرا هنوز شروع نشده است.

### ۱۸٫۱ وضعیت پیوست — با متن سند اشتباه نشود

- نام اعلام‌شده: **`طرح سیستم Affiliate Marketing اینستاگرام برای Bazino Pro (1).md`**، مسیر اعلام‌شده `/home/user/uploads/`.
- `read_file` روی مسیر دقیق خطا داد؛ خود پوشهٔ uploads در محیط وجود نداشت. جست‌وجوی فایل در `/home/user` و مسیرهای جایگزین `/mnt` و `/tmp` نتیجه‌ای نداشت. ریموت همین شاخه همچنان روی `dfac97c` بود؛ سند تازه‌ای در آن دیده نشد.
- **اصل سند جدید خوانده یا در ریپو ذخیره نشده است.** هیچ متن جایگزینی به نام «اصل سند کاربر» ساخته نشود. جست‌وجوی عمومی وب نیز جای متن خصوصیِ پیوست را نمی‌گیرد.
- درخواست دقیق برای بازکردن مانع: اصل Markdown را دوباره ارسال/متن آن را درج کند، یا روی همین شاخه در مسیر پیشنهادی `docs/payments/INSTAGRAM_AFFILIATE_DESIGN.md` بارگذاری کند. پس از دریافت، نسخهٔ اصلی با منشأ/هش ذخیره و لینک آن به هندآف اضافه شود.

### ۱۸٫۲ تصمیم‌های قطعی از خود پیام کاربر

- **Manus فقط ID پست یا ریلِ واقعاً منتشرشده را برای سرور بازینو می‌فرستد.** شناسهٔ اکانت شریک، ساخت کد/لینک و هدایت افیلیت دیگر مسئولیت Manus نیست.
- بقیهٔ گردش کار طبق **سند جدید، پس از دریافت آن** در بک‌اند خودمان اجرا شود؛ موتور موجود بازاستفاده شود، نه ساخت افیلیت/دیتابیس موازی.
- کاربر گفته وب‌هوک Zernio با URL **`https://bazino.pro/api/webhooks/zernio`** ساخته شده و آماده است. این **اعلام کاربر دربارهٔ اشتراک سمت Zernio** است؛ فعال‌بودن/پاسخ صحیح receiver روی هاست در این نوبت تست نشده است. URL هدف تغییر نکند.
- درخواست قبلی خواندن `ZERNIO_WEBHOOK_SECRET` از هاست و اصول امنیت پنل لغو نشده‌اند؛ نحوهٔ نهایی جریان کمپین از سند تازه مشخص شود.

### ۱۸٫۳ خروجی فعلی و قدم بعد

- [docs/payments/INSTAGRAM_MEDIA_ONLY_PLAN.md](docs/payments/INSTAGRAM_MEDIA_ONLY_PLAN.md) **پیش‌نویس موقت بر اساس پیام کاربر و کد موجود** است: ingest موجود → گیرندهٔ همان URL با HMAC/صف پایدار → قواعد افیلیت در بک‌اند → تنظیمات/تست/استقرار. این فایل اصل پیوست یا پلن نهایی مبتنی بر آن نیست.
- `ZERNIO_RECEIVER_PLAN.md` به‌عنوان سابقهٔ بررسی ZIP حفظ و با هشدار دامنه علامت‌گذاری شد؛ فاز ۳ در `AFFILIATE-IG.md` نیز API موجود/تاریخچه است، نه قرارداد جدید Manus.
- در کد بررسی‌شده ingest و `partner-invite` وجود دارند، اما مسیر محصول هنوز `/api/integrations/zernio/webhook` است؛ گیرندهٔ `/api/webhooks/zernio` هنوز ادغام نشده است. هیچ کد محصول، تنظیم هاست، اشتراک، ارسال واقعی یا تست برنامه در این نوبت تغییر/اجرا نشده است.
- پس از دریافت اصل سند: خواندن و ذخیرهٔ واقعی آن، تطبیق مرحله‌به‌مرحله با کد، نهایی‌کردن پلن و ارائه برای تأیید؛ سپس اجرای بی‌وقفه طبق قانون ۱.
- **قانون جدید کاربر در §۵٫۵ / قانون ۳ ثبت شد:** پس از هر تغییر کد یا اجرای پلن، اسناد مرتبط و هندآف خودکار به‌روز و همهٔ تغییرات مرتبط commit/push شوند؛ بدون نیاز به درخواست مجدد. این الزام از همین تحویل مستندات رعایت می‌شود.

---

## ۱۹. متن کامل طرح افیلیت دریافت شد — پلن نهایی برای تأیید

> **سابقهٔ طراحی نسخهٔ ۱:** اصل سند/قواعد این بخش محفوظ‌اند؛ درخواست بعدیِ ناشر قابل‌تعویض و فهرست رویدادها در بخش ۲۰، پلن را به نسخهٔ ۲ و ۸ بچ ارتقا داده است.

> ۱۴۰۵/۰۶/۱۶ (2026-09-07) · کاربر متن کامل طرح و توضیح تطبیق شناسهٔ رسانه در Zernio را داخل پیام فرستاد و **طراحی و پلن نهایی** خواست. این نوبت مستندسازی/طراحی است؛ اجرای کد شروع نشده است.

### ۱۹٫۱ مرجع معتبر و وضعیت دریافت

- **اصل متن پیام:** [docs/payments/INSTAGRAM_AFFILIATE_DESIGN.md](docs/payments/INSTAGRAM_AFFILIATE_DESIGN.md)، ۱۱ بخش + References + هشت متن همکار چهارزبانه؛ متن فارسی پیام دوم بدون ویرایش محتوایی محفوظ است.
- SHA-256: `90ad455b98649cf5ba7ff858edfe589d19b24b581a20bcc9aa8edd7ebb96651b`. این هش فایل ذخیره‌شده از **متن پیام** است؛ ادعای خواندن یا تطابق باینری با پیوست قدیمی نمی‌شود.
- **E.108 رفع شد.** دیگر به دلیل نبود پیوست از کاربر درخواست تکرار سند نشود. مرجع اجرای پیشنهادی: [docs/payments/INSTAGRAM_MEDIA_ONLY_PLAN.md](docs/payments/INSTAGRAM_MEDIA_ONLY_PLAN.md)، نسخهٔ ۱، جایگزین پیش‌نویس موقت قبلی.
- `ZERNIO_RECEIVER_PLAN.md` و فاز ۳ در `AFFILIATE-IG.md` با برچسب تاریخچه نگه‌داری شده‌اند؛ رفتار سادهٔ ZIP یا دستور «لینک را به شریک بفرست» مرجع فلو جدید نیست.

### ۱۹٫۲ تصمیم‌های طراحی نهایی پیشنهادی

1. Manus فقط `media_id` پست/ریل منتشرشده را با توکن مجاز به `/api/integrations/instagram/published-media` می‌فرستد؛ نه account id شریک، نه ساخت کد/لینک. registry رسانه ماندگار و وابسته به account/campaign/policy است.
2. گیرنده روی **`https://bazino.pro/api/webhooks/zernio`** ثابت می‌ماند؛ HMAC از `ZERNIO_WEBHOOK_SECRET` هاست، سپس حساب مجاز + تطبیق دقیق `postId/mediaId` واقعی اینستاگرام با media_id ثبت‌شده. ID داخلی Zernio، commentId و author.id جای رسانه استفاده نمی‌شوند. خارج از scope = صفر ارسال/کوپن.
3. کلیدواژه‌های Whole Word: **آماده / Hazır / Ready / Готово**. در پست چندزبانه کلیدواژه زبان پاسخ را تعیین می‌کند؛ Reel تک‌زبانه به زبان مجاز خودش محدود، زبان دوست از دعوت مربوط، زبان مبهم بدون پاسخ خودکار. تغییر زبان مجوز PR دوم نیست.
4. **همکار:** یک PR توضیحی + دکمه، سپس DM کد و متن آماده بدون لینک. **دوست:** کامنت همان کد زیر همان رسانه، PR درخواست Follow، سپس DM لینک فقط به خودش پس از Gate. شرح §۲ سند بر دیاگرام خلاصهٔ §۸ مقدم پیشنهاد شده است.
5. فقط `comment.received` کافی نیست؛ **`message.received` نیز در همان اشتراک برای دکمه‌ها/DM لازم است**. metadata دکمه، sender واقعی و conversation به member/media/policy مقید شوند؛ payload دانسته‌شدهٔ شخص دیگر مجوز Gate او نیست.
6. Share = شاهد کامنت دوست؛ Follow unknown با verified/منفی مخلوط نشود. **پیشنهاد رفع ابهام Like:** حداقل لینک = Share/Follow تعامل مصوب؛ فعال‌سازی کوپن در Gate سایت شامل رضایت/ورود موجود و Like با برچسب خوداظهاری، نه تأیید API. این تصمیم پیشنهادی در خود پلن شفاف آمده و با تأیید آن تثبیت می‌شود.
7. کوپن به friend/site-user اختصاص داشته باشد، نه یک کد مشترک یک‌بارمصرف برای همهٔ دوستان یک شریک. Gate واقعی سایت، اعتبار token، عدم نشت لینک و حفظ کلید لینک‌های قبلی باید پیاده/تست شوند.
8. انتساب آخرین لینک معتبر و تقدم کد دستی معتبر، ثبت سروری، یک صاحب کمیسیون برای فروش واجد شرایط و Pending تا مهلت refund؛ هیچ پاداش نقدی برای تعامل اجتماعی. نرخ‌ها/مبالغ نمونه خودکار فعال نشوند؛ مشتری جدید و policy مالی/کوپن/تسویه پیش از فعال‌سازی تأیید شوند.

### ۱۹٫۳ یافته‌های کد و تحویل

- بازبینی ایستا نشان داد: ingest فعلی نوع media را هم اجباری می‌کند؛ مسیر جدید webhook هنوز در محصول ثبت نیست؛ زبان از caption و keyword تک‌مقداری است؛ وضعیت sent پیش از پاسخ provider ثبت می‌شود؛ مسیر DM/metadata دکمه نیاز تطبیق دارد؛ کوپن `SQUAD-<partnerCode>` مشترک است؛ helper امضای لینک وجود دارد ولی اتصال Gate/اعتبارسنجی آن در route/UI سایت در جست‌وجو پیدا نشد؛ پرامپت فعلی پنل صریحاً لینک را برای همکار می‌خواهد. **این‌ها با نوشتن پلن رفع نشده‌اند.**
- راهنمای Instagram، Changelog و Inbox webhooks Zernio برای سقف PR، دکمه/metadata، DM و محدودیت رضایت Follow خوانده شدند. تماس با حساب واقعی، ارسال، نصب، تست برنامه/Chromium، تغییر subscription یا استقرار در این نوبت انجام نشد.
- بچ‌های پلن: قرارداد/registry → receiver/صف → ماشین حالت چهارزبانه → Gate/کوپن → attribution/مالی/KPI → پنل امن → رگرسیون/تحویل/استقرار. طبق قانون ۳، اسناد این نوبت و تحویل‌های بعدی بدون یادآوری commit/push می‌شوند.
- **قدم بعد:** تأیید/دستور شروع همین پلن توسط کاربر. کد از صفر بازسازی نمی‌شود؛ سرویس‌ها/دیتابیس موجود بازاستفاده و شکاف‌ها تکمیل می‌شوند. ساخت اشتراک Zernio اعلام کاربر است، نه شاهد آماده‌بودن receiver روی هاست.

---

## ۲۰. رویدادهای Zernio و ناشر قابل‌تعویض — پلن نسخهٔ ۲

> **سابقهٔ نسخهٔ ۲؛ محفوظ در نسخهٔ ۳.** بخش ۲۱ دامنهٔ Composer ادمین و upload/قالب‌ها را صریح کرده است؛ برای اجرای بعدی پلن نسخهٔ ۳ مرجع است.

> ۱۴۰۵/۰۶/۱۶ (2026-09-07). کاربر فهرست گزینه‌های webhook را فرستاد و خواست انتخاب مناسب عملکرد/پوشش مشخص شود و سیستم برای کنارگذاشتن احتمالی Manus و انتشار مستقیم از پنل با Zernio، نیازمند بازنویسی هسته نشود. درخواست فعلی طراحی/فهرست است، نه شروع اجرای کد. وضعیت تجاری/مالکیت Manus/Meta در این نوبت راستی‌آزمایی نشده و مبنای ادعای خبری قرار نگرفته است.

### ۲۰٫۱ فهرست تنظیمات پیشنهادی

مرجع کامل: [docs/publishing/ZERNIO_EVENTS_AND_ARCHITECTURE.md](docs/publishing/ZERNIO_EVENTS_AND_ARCHITECTURE.md).

- **وب‌هوک اصلی، ۲۳ رویداد:** Posts همهٔ ۹ مورد به‌جز `post.tiktok.url_resolved`؛ هر ۳ External Posts؛ `account.connected/disconnected`؛ Messages شامل `message.received/sent/edited/deleted/read` و `reaction.received` و `referral.received`؛ `conversation.started` و `comment.received`.
- `message.delivered` و `message.failed` برای دامنهٔ فعلی Instagram تیک پیشنهادی ندارند؛ نبود callback وضعیت تحویل/شکست را اثبات نمی‌کند. Instagram رسید delivery مستقل ندارد؛ خطای ارسال از نتیجهٔ API/reconciliation نیز کنترل می‌شود.
- **`analytics.synced` روی اشتراک اصلی فعال نشود.** برای عملکرد/ایزوله‌کردن شکست‌های آمار، subscription و صف جدا با endpoint پیشنهادی `/api/webhooks/zernio/analytics` و Secret مستقل پیشنهادی `ZERNIO_ANALYTICS_WEBHOOK_SECRET` در طراحی آمده است. endpoint هنوز مستقر نیست؛ ساخت اشتراک دوم قبل از آماده‌شدن لازم نیست.
- Calls، Reviews، Ads، WhatsApp، Phone Numbers، Verify و `account.ads.initial_sync_completed` خارج از دامنه‌اند و فعلاً انتخاب نشوند. گزینه‌های خاموش به معنی «برای همیشه غیرقابل‌پشتیبانی» نیستند.
- External Posts کشف/همگام‌سازی است، نه مجوز خودکار کمپین یا تضمین اعلان فوری. reaction پیام، Like پست نیست و referral مکالمه، کلیک سایت/Paid نیست.

### ۲۰٫۲ تصمیم معماری

1. تولید محتوا، انتشار و افیلیت سه لایهٔ مستقل: Generator → Content/Approval → Publishing Service → adapter ناشر → **Published Media Registry مشترک** → Affiliate Engine موجود.
2. آداپتور بیرونی فعلی Manus فقط media_id می‌دهد؛ آداپتور داخلی Zernio از API رسمی انتشار و رویداد per-platform استفاده می‌کند. affiliate فقط ID بومی رسانهٔ منتشرشده و مصوب را می‌بیند؛ شرط «حتماً از Manus آمده» ندارد.
3. registry منشأ، approval، job/occurrence/attempt، account و ID بومی را از ID داخلی Zernio جدا نگه می‌دارد. رخدادهای کل/per-platform یا دو گزارش یک رسانه، ثبت/ارسال تکراری نسازند.
4. external.created ابتدا discovered/needs_review؛ پست ناشناس/قدیمی با webhook خودکار وارد کمپین نشود. وضعیت حذف/قطع حساب بدون پاک‌کردن سوابق مالی و تعهدات قبلی رسیدگی شود.
5. انتخاب ناشر فقط برای jobهای جدید؛ job درحال‌اجرا مالک ثابت داشته باشد. timeout نامشخص، مجوز انتشار دوباره یا failover کور به ناشر دیگر نیست. پس از drain کارهای قبلی، توکن Manus می‌تواند با تصمیم مدیر باطل شود.
6. inbox/dedup/dispatch پایدار، صف کامنت و دکمه با اولویت بالا، صف آمار/اکتشاف کم‌اولویت و acknowledge سریع **پس از ذخیرهٔ پایدار**؛ بدون عملیات سنگین شبکه در HTTP handler.
7. آداپتور نشر مستقیم در بچ ۷ پلن نسخهٔ ۲ ساخته/تست می‌شود، با پیش‌فرض external و بدون انتشار زنده تا تأیید batch؛ بچ نهایی رگرسیون/استقرار اکنون **بچ ۸** است. تغییرات آتی API ممکن است اصلاح adapter بخواهند؛ تضمین «هیچ تغییری در آینده» داده نمی‌شود.

### ۲۰٫۳ مرز بررسی و ادامه

- Changelog رسمی، Analytics/Account webhooks و مدل‌های SDK رسمی خوانده شدند. بعضی صفحات Posts/Inbox فقط navigation برگرداندند؛ آن محتوا خوانده‌شده فرض نشد و منابع جایگزین رسمی استفاده شدند.
- یافتهٔ کد: `ContentService.publishOne` فعلاً به `zernio_publish_webhook` تنظیم‌شده POST می‌کند؛ هنوز چرخهٔ مستقیم رسمی نشر Zernio، job correlation و sync وضعیت کامل نیست. این فاصله در پلن ثبت است و با تیک‌زدن eventها رفع نمی‌شود.
- اصل سند کاربر `INSTAGRAM_AFFILIATE_DESIGN.md` و هشت متن آن دست نخورده‌اند؛ قواعد کد فقط برای همکار، لینک فقط برای دوست، Gate صادقانه و مالی مصوب پابرجا هستند.
- **فقط اسناد به‌روز و طبق قانون ۳ commit/push می‌شوند.** اشتراک کاربر، سکرت‌ها، کد محصول، پیام/محتوا و هاست تغییر نکرده‌اند. اجرا پس از تأیید/دستور شروع پلن نسخهٔ ۲ است؛ URL اصلی `https://bazino.pro/api/webhooks/zernio` ثابت می‌ماند.

---

## ۲۱. انتشار دستی ادمین با رسانه، کپشن و قالب — پلن نسخهٔ ۳

> **سابقهٔ نسخهٔ ۳؛ در نسخهٔ ۴ محفوظ است.** بخش ۲۲ سوییچ دستی/عامل و دفتر عامل‌ها با Manus پیش‌فرض را اضافه کرده؛ برای ادامه، نسخهٔ ۴ ملاک است.

> ۱۴۰۵/۰۶/۱۶ (2026-09-07). کاربر صریحاً خواست انتشار پست از پنل مدیریت با Zernio، **بارگذاری ویدئو/تصویر، متن کپشن و قالب اسلایدی یا غیره** در طرح لحاظ شود. این درخواست تکمیل دامنهٔ طراحی است؛ دستور اجرای کد نیست.

- در `docs/payments/INSTAGRAM_MEDIA_ONLY_PLAN.md` نسخهٔ **۳** و در `docs/publishing/ZERNIO_EVENTS_AND_ARCHITECTURE.md §۵٫۱` ثبت شد. تعداد بچ‌ها **۸** و تیک‌های اصلی **۲۳** تغییر نکردند؛ بچ ۷ شامل Composer کامل، upload/library و آداپتور انتشار است.
- Composer مشترک پنل سایت و نرم‌افزار مدیریت: فایل واقعی از دستگاه، progress/cancel/retry، مرتب‌سازی/حذف/جایگزینی اسلایدها، پخش/کاور ویدئو، caption با خط جدید/emoji/hashtag/mention، پیش‌نویس و preview، تأیید و انتشار اکنون/زمان‌بندی با timezone صریح.
- قالب‌های هدف: تک‌تصویر، Carousel تصویر/ویدئو ترکیبی، Reel تک‌ویدئو و Story فقط با قابلیت/مجوز معتبر حساب. Instagram متن‌تنها ندارد؛ انتخاب قالب با وعدهٔ ویرایشگر Canva/تدوین ویدئو/HTML caption یا استیکر نامستند یکی نیست.
- اصل فایل در media library خصوصی/پایدار، با assetId/version/hash؛ مدل تک‌فایل فعلی برای Carousel کافی نیست. Volume واقعی یا storage adapter معتبر لازم است؛ متفاوت‌بودن مسیر از cwd به‌تنهایی اثبات persistence نیست.
- راهنمای رسمی Zernio: presign با `filename/contentType`، سپس PUT و `publicUrl` در `mediaItems`؛ uploadUrl حدود یک ساعت و temp هفت روز. اصل فایل برای پیش‌نویس/زمان‌بندی طولانی محفوظ و نزدیک زمان نشر به provider منتقل شود؛ `permanent:true` حذف‌شده، راه‌حل فرضی نیست. سقف عمومی upload با سقف انتشار Instagram اشتباه نشود.
- هر تغییر caption/رسانه/ترتیب/قالب/حساب بعد از approval، نسخهٔ تأییدشده را باطل کند؛ upload موفق یا درخواست پذیرفته‌شده، published نیست. Story/پست عمومی بدون campaign هرگز خودکار وارد افیلیت نشود؛ قواعد محتوای Affiliate و حریم خصوصی لینک دوست محفوظ‌اند.
- یافتهٔ ایستا: `ContentConsole` فقط فرم متن دارد و `ContentVersion` فقط `mediaUrl/mediaType` تک‌فایل؛ این قابلیت هنوز پیاده نشده است. راهنما/کد خوانده شد، ولی هیچ upload، تست برنامه/Chromium، API انتشار، تغییر کد/هاست یا رویداد زنده اجرا نشد.
- اسناد و هندآف طبق قانون ۳ خودکار commit/push می‌شوند. **قدم بعد: تأیید/دستور شروع پلن نسخهٔ ۳**؛ انتشار واقعی همچنان نیازمند approval محتوای همان batch و تنظیمات مجاز است.

---

## ۲۲. سوییچ دستی/عامل و تعریف عامل با API Key — Manus پیش‌فرض ذخیره‌شده

> ۱۴۰۵/۰۶/۱۶ (2026-09-07). کاربر خواست در پنل بین انتشار دستی و انتشار توسط عامل سوییچ شود، عامل با درج API Key قابل تعریف باشد و پیش‌فرض ذخیره‌شده Manus باشد. این نوبت تکمیل طراحی است؛ اجرای کد/ثبت عامل یا کلید واقعی انجام نشده است.

- مرجع: `docs/payments/INSTAGRAM_MEDIA_ONLY_PLAN.md` **نسخهٔ ۴** و `docs/publishing/ZERNIO_EVENTS_AND_ARCHITECTURE.md §۵٫۲`. تعداد بچ‌ها ۸ و رویدادهای اصلی ۲۳ ثابت است؛ Agent Registry/سکرت‌ها در بچ ۶ و Composer/سوییچ/اجرای adapters در بچ ۷.
- دو mode ماندگار: **manual** (Composer ادمین و backend/Zernio بدون فراخوانی Manus) و **agent** (عامل انتخاب‌شده با قابلیت نشر و approval معتبر). executionMode، agentId و publishingProvider جدا هستند؛ API Key یا نام عامل، قابلیت/مجوز نشر ایجاد نمی‌کند.
- **Manus یک رکورد built-in واقعی در DB و defaultAgentId ذخیره‌شده دارد**؛ seed اولیه idempotent و بدون کلید ساختگی. default سفارشی، rename/disable یا credential پاک‌شده با restart برنگردد. بدون کلید/تست، Manus تعریف‌شده ولی نیازمند پیکربندی است، نه آماده.
- پیش‌فرض عامل با پیش‌فرض حالت یکی نیست: mode قبلی مدیر حفظ شود؛ در نبود انتخاب ذخیره‌شده، قبل از اولین job مدیر mode را انتخاب کند. صرف نصب/انتخاب Manus، task یا انتشار خودکار ایجاد نکند.
- مدیریت عامل‌ها: نام/نوع adapter، API Key امن، فعال/غیرفعال، انتخاب پیش‌فرض، وضعیت و تست اتصال آگاهانه؛ profile فاقد adapter/قابلیت publish قابل استفادهٔ واقعی معرفی نشود. تعریف API Key برای هر API دلخواه، پشتیبانی خودکار آن نیست.
- Secret فقط در vault سرور با credentialRef؛ نه پاسخ status، AgentProfile عمومی، job، prompt، log یا localStorage. API Key سرویس عامل با توکن `baz_…` برای ingest و کلید/Secret زرنیو متفاوت است.
- **مهاجرت Manus:** کد فعلی `manus_api_key` را قبل از `MANUS_API_KEY` می‌خواند؛ منبع مؤثر حفظ/نمایش شود و تعارض به انتخاب صریح مدیر برسد. تقدم env برای زرنیو به‌صورت کور روی Manus اعمال نشود. پاک‌کردن credential نباید موجب fallback مخفی به کلید legacy/env شود.
- سوییچ/عامل پیش‌فرض فقط کارهای جدید را تغییر دهد؛ job با mode/agent/version/provider/owner/approval ثابت و بدون Secret snapshot شود. callback دیررس یا عامل دیگر، نسخهٔ دستی تازه را overwrite نکند؛ لغو remote نامطمئن لغوشدهٔ قطعی گزارش نشود؛ agent یا کلید دیگر بی‌صدا جایگزین نشود.
- در حالت عامل هم قرارداد افیلیت ثابت است: فقط media_id منتشرشده به ingest؛ کد/لینک خصوصی دوست/Gate/کوپن/مالی در backend. انتخاب عامل approval نسخه/batch یا مجوز خرج اعتبار/انتشار را دور نمی‌زند.
- یافتهٔ ایستا: سرویس محتوا Manus را hardcode می‌کند و مدل ContentItem mode/agentId ندارد؛ providerهای Jarvis معادل دفتر عامل ناشر نیستند. **هیچ پروفایل/کلید واقعی در این نوبت ساخته یا متصل نشد؛ فقط اسناد طبق قانون ۳ commit/push می‌شوند.** قدم بعد تأیید/دستور شروع پلن نسخهٔ ۴ است.


## V4 / Batch 1 — قرارداد رسانه و زیربنای امن

- اجرا: registry ID-only، campaign policy نسخه‌دار، seed ماندگار Manus، vault رمزگذاری‌شده، منع افشای settings و scope توکن ingest پیاده شد؛ partner-invite بیرونی 410 و راهنمای عامل اصلاح شد.
- آزمون/مرز: ۱۱/۱۱ تست جدید SQLite؛ tsc موفق؛ Chromium واقعی/تصویر batch1.png باز و بررسی شد، بدون خطای کنسول. UI مرحلهٔ بعدی هنوز ساخته نشده.
- تاریخ: 2026-09-07. هیچ انتشار/پیام زنده بدون مجوز محتوای مشخص انجام نشده است.


## V4 / Batch 2 — گیرندهٔ امضاشده و صف پایدار

- اجرا: مسیر /api/webhooks/zernio و health و Analytics جدا، HMAC قبل از پردازش، نرمال‌سازی دقیق ID، dedup/claim، outbox با delivery_unknown و lifecycle/analytics worker اضافه شد. اشتراک/هاست واقعی هنوز تغییر نکرده است؛ دسترسی خواندن GitHub secrets با 403 محدود بود (نه درخواست کلید در چت).
- آزمون/مرز: ۱۹/۱۹ تست v4؛ TypeScript موفق؛ Chromium واقعاً هر دو مسیر اصلی/قدیمی را با raw HMAC آزمود؛ تصویر batch2 بازبینی شد و خطای کنسول نداشت.
- تاریخ: 2026-09-07. هیچ انتشار/پیام زنده بدون مجوز محتوای مشخص انجام نشده است.


## V4 / Batch 3 — ماشین حالت همکار/دوست چهارزبانه

- اجرا: Whole Word یونیکد، متن‌های دقیق سند، دکمه امضاشده مقید به فرستنده، کد فقط در DM همکار و لینک فقط هنگام ارسال به دوست پیاده شد؛ لاگ/صف لینک خام ندارد. شبیه‌ساز قدیمی که کوپن واقعی می‌ساخت بازنشسته شد؛ مالی policy تأییدنشده fail-closed است.
- آزمون/مرز: ۲۹/۲۹ تست v4، TypeScript؛ Chromium کامنت امضاشده را تا صف PR واقعی SQLite و زبان درست دنبال کرد (بدون ارسال زنده)، تصویر batch3 بازبینی شد. UI جدید در بچ ۶ می‌آید.
- تاریخ: 2026-09-07. هیچ انتشار/پیام زنده بدون مجوز محتوای مشخص انجام نشده است.


## V4 / Batch 4 — Gate واقعی سایت و کوپن مستقل هر دوست

- اجرا: مسیر مستقل /ig/invite با امضای مقید به دوست و no-referrer، رضایت، ورود/تأیید شماره، Like خوداظهاری و claim اتمیک پیاده شد. کوپن owner-bound با سهمیهٔ مستقل؛ تکرار/رقابت و انتقال دعوت به حساب دیگر مهار شد.
- آزمون/مرز: ۳۷/۳۷ تست v4؛ TypeScript؛ Chromium چهارزبانه (FA/EN دسکتاپ، TR/RU موبایل)، ۵ تصویر واقعی بازبینی شد، صفر خطای کنسول/overflow. فعال‌سازی نمونه با SQLite واقعی انجام شد؛ نه مشتری/پیام واقعی.
- تاریخ: 2026-09-07. هیچ انتشار/پیام زنده بدون مجوز محتوای مشخص انجام نشده است.


## V4 / Batch 5 — انتساب مالی، مهلت بازپرداخت و تسویهٔ ماهانه

- اجرا: تراکنش اتمیک کمیسیون با مبلغ مرجع پرداخت، مشتری جدید/کارمند/خودارجاعی، snapshot ارجاع و سانس حضوری اضافه شد. hold policy با تأیید دستی دور زده نمی‌شود؛ واریز ماهانهٔ کیف پول از تحویل نقد تفکیک و برگشت کنترل شد. انتساب به username ارسالی ناشناس بسته و داشبورد همکار اینستاگرامی بدون لینک و PII است.
- آزمون/مرز: ۴۶/۴۶ تست v4، ۹۹/۹۹ واحد و ۴۱/۴۱ مدیریت؛ TypeScript؛ پروفایل کد-فقط در Chromium واقعی بازبینی شد (batch5-profile.png)، بدون خطای کنسول. هیچ پول واقعی جابه‌جا نشده.
- تاریخ: 2026-09-07. هیچ انتشار/پیام زنده بدون مجوز محتوای مشخص انجام نشده است.


## V4 / Batch 6 — استودیوی مشترک، عامل‌ها و تنظیمات امن

- اجرا: UI مشترک کمپین، registry، رویداد/گزارش، سکرت‌ها و Agent Registry/Manus پیش‌فرض ساخته شد. نگه‌داری بدنهٔ حاوی کلید در صف localStorage متوقف، فرم قدیمی ناامن بازنشسته و کنترل‌های مجوز/CAS اضافه شدند. Composer/آداپتور نشر در بچ ۷ تکمیل می‌شود؛ هیچ تماس/انتشار زنده انجام نشده.
- آزمون/مرز: ۵۱/۵۱ تست v4؛ TypeScript واقعی سایت پس از نصب @types/react و TypeScript/بیلد مدیریت موفق. Chromium چهار زبان و موبایل/دسکتاپ + اپ مدیریت، تصاویر بررسی شد؛ کلید آزمایشی در localStorage نبود. GH_TOKEN منقضی شده و push از بچ ۵ مسدود است.
- تاریخ: 2026-09-07. هیچ انتشار/پیام زنده بدون مجوز محتوای مشخص انجام نشده است.


## V4 / Batch 7 — کتابخانهٔ رسانه، Composer و آداپتورهای انتشار

- اجرا: آپلود قطعه‌ای مالک‌دار و منبع ماندگار، preview خصوصی کوتاه‌عمر، Composer عکس/اسلایدی/ویدئو/کاور، approval immutable و batch سه‌تایی کمپین تکمیل شد. Zernio presign+PUT+posts و Manus v2 task/poll/RSA با تفکیک دستی/عامل، کنترل late callback/unknown delivery و restaging پیاده شد. مسیر قدیمی نشر سوشیال بسته و blog/نسخهٔ نمایشی سخت‌گیرانه شد. Push همچنان به علت GH_TOKEN منقضی مسدود است.
- آزمون/مرز: ۵۱/۵۱ هستهٔ v4 + ۲۰/۲۰ فایل/نشر؛ TypeScript هر دو پروژه و build مدیریت. PNG/JPEG و MP4 واقعی با ffprobe بررسی شد؛ Chromium در سایت آپلود/ترتیب/تأیید/صف و در مدیریت clone را آزمود، تصاویر واقعی بازبینی شدند. پاسخ APIهای بیرونی mock است؛ هیچ پست زنده منتشر نشد.
- تاریخ: 2026-09-07. هیچ انتشار/پیام زنده بدون مجوز محتوای مشخص انجام نشده است.

## V4 / Batch 8 — رگرسیون نهایی، شواهد مرورگر و آماده‌سازی تحویل

- TypeScript هر دو پروژه و build کامل production موفق؛ **506/506** تست با صفر failure/skip: 21 media، 54 V4، 41 management، 99 unit، 38 SQLite، 27 provider contract، 42 UI و 181 API.
- API fixtureها با JWT واقعی، تاریخ معتبر و قرارداد مالی جاری اصلاح شدند؛ تست امنیت receiver/سکرت/آپلود اضافه شد. guardهای ورودی، unique claim پس از update، outbox operator-confirmed، مدیریت خطای نامشخص و بازیابی کوپن پس از reload تقویت شدند.
- runner Chromium production با دیتابیس/کلیدهای موقت، چهار زبان/موبایل/دسکتاپ و restart واقعی اضافه شد؛ ۲۰ تصویر کامل، بدون خطای JS/overflow. خواندن تصاویر، نبود فونت سیریلیک را آشکار کرد؛ DejaVu Sans افزوده، سوئیت دوباره اجرا و روسی بازبینی شد.
- قالب کامل Workflow جدید در `docs/publishing/publishing-v4.workflow.yml` و راهنمای `DEPLOY_AND_OPERATE.md` تحویل شد. GitHub App مجوز workflows ندارد و فعال‌سازی در `.github/workflows/` را رد کرد؛ Workflow استقرار موجود جایگزین نشد.
- push عقب‌ماندهٔ بچ‌های ۵–۷ اکنون موفق است. نتیجهٔ نهایی GitHub/استقرار و مرز تماس زنده در `docs/publishing/V4_DELIVERY.md` ثبت می‌شود؛ TLS دامنه و 403 metadata سکرت‌ها موفقیت هاست را اثبات نکرده‌اند.
- هیچ پیام/پست/پول واقعی یا اعتبار سرویس مصرف نشده؛ SQL/Mongo زنده و انتشار واقعی جدا تست‌نشده‌اند. بررسی پرداخت آنلاین فقط mock ایزوله بوده است.


### تکمیل تحویل V4 — GitHub و مرز استقرار

- PR #20 باز شد: https://github.com/paymanshafayan/bazino-gamenet-portal/pull/20 . کد هشت بچ به شاخهٔ جلسه push شد؛ merge خودکار یا push مستقیم main انجام نشد.
- سه check موجود روی کد بچ ۸ در GitHub سبز شدند؛ نتیجهٔ نهایی محلی پس از تقویت pin عامل: 506/506، شامل 24 تست رسانه/نشر.
- افزودن workflow فعال به permission workflows و dispatch استقرار به permission Actions نیاز دارد؛ GitHub App هر دو را رد کرد. قالب CI کامل در docs/publishing/publishing-v4.workflow.yml تحویل است. مدیر می‌تواند PR را merge/مسیر استقرار main را اجرا یا اتصال GitHub در Arena را با مجوزهای لازم اصلاح کند؛ کلید در چت خواسته نشود.
- fetch جایگزینِ health دامنه، صفحهٔ HTML عمومی برگرداند، نه JSON گیرنده؛ استقرار واقعی و تماس زندهٔ Zernio/Manus همچنان تأیید نشده‌اند.
- generation منسوخ قبل از task هزینه‌دار متوقف و تنظیمات project/profile عامل برای job مصوب pin شد؛ تغییر default/health metadata یا API Key با انتقال پنهان مالک کار یکی نیست. جزئیات و ZIP در گزارش تحویل است.

- تأیید نهایی GitHub: آخرین کد `5b9ef0d` در PR #20، هر سه check موجود را گذراند (run 34133592889). ZIP سورس + ۲۰ تصویر و شواهد محلی، بدون credential/runtime DB، با manifest commit تحویل شد. این موفقیت، permission مسدودِ deployment یا تست زندهٔ provider را رفع نمی‌کند.

### V4 — بازاجرای مستقل پیش از گزارش نهایی (2026-09-07)

- فایل‌های کاری با ریموت `660fd9a` کامل برابر بودند؛ metadata گیت قدیمی بدون دست‌زدن به فایل‌ها همگام شد. وضعیت فعلی محصول همان اجرای هشت بچ است، نه کدنویسی دوباره.
- پس از بازسازی وابستگی/native، TypeScript هر دو پروژه، build production و **506/506 تست با صفر fail/skip** مجدداً گذشتند.
- Chromium اول در capture دیالوگ timeout داد؛ علت قطعی نامعلوم است. اجرای مجددِ مستقل با همان کد کامل موفق شد؛ ۲۰ تصویر تازه همگی با read_file بازبینی شدند و restart واقعی هم گذشت. شکست اول پنهان/skip نشده و لاگ هر دو اجرا در بسته است.
- PR #20 باز، هر سه check موجود روی `660fd9a` موفق؛ dispatch استقرار دوباره با 403 رد شد. health عمومی هنوز HTML برمی‌گرداند، نه JSON receiver. مجوز Actions/Workflows یا استقرار توسط مدیر لازم است؛ هیچ پیام/پست/پول واقعی جابه‌جا نشده.
- شواهد: `tests/reports/v4-recheck-summary.json` و `docs/publishing/V4_DELIVERY.md`. اسناد به‌روز و ZIP سورس/گزارش/۲۰ تصویر مجدداً تهیه می‌شود؛ runtime DB و فایل credential در بسته نیستند.

---

## ۲۳. گزارش جاری انجام‌شده و باقی‌مانده — تحویل V4

> ۱۴۰۵/۰۶/۱۶ (2026-09-07). درخواست جاری کاربر: همهٔ اسناد به‌روز، کارهای انجام‌شده و باقی‌مانده در هندآف ثبت و همهٔ تغییرات مرتبط commit/push شوند. اجرای هشت بچ از قبل روی شاخه موجود است؛ این پیگیری بازنویسی محصول نیست.

### ۲۳٫۱ انجام‌شده در کد

| بخش | نتیجه |
|---|---|
| ثبت انتشار | Manus فقط media_id، registry مصوب چندمنبعی، کنترل حساب/رسانه و توکن ingest محدود؛ partner-invite قدیمی 410 |
| گیرنده | مسیر اصلی و قدیمی با HMAC/raw body، health JSON، Analytics جدا، dedup/صف پایدار و عدم retry کور |
| افیلیت | چهار کلیدواژه/زبان؛ PR اول و DM دوم؛ کد فقط برای همکار، لینک فقط برای دوست؛ دکمه مقید به هویت و policy |
| Gate و کوپن | مسیر واقعی `/ig/invite/:id`، رضایت/ورود/شماره تأییدشده، Like خوداظهاری و کوپن اتمیک owner-bound مستقل هر دوست |
| مالی | انتساب سروری، مبلغ پرداخت مرجع، مشتری جدید/سانس، یک صاحب کمیسیون، refund hold و تفکیک اعتبار کیف پول از تحویل نقد |
| عامل‌ها | استودیوی مشترک دو پنل، سوییچ دستی/عامل، Manus پیش‌فرض در DB، API Key رمزگذاری‌شده، حفظ revoke و pin تنظیمات عامل |
| انتشار دستی | upload قطعه‌ای واقعی، اصل فایل ماندگار، تصویر/ویدئو/Carousel/کاور/کپشن، preview/approval نسخه و زمان‌بندی؛ آداپتور Zernio/Manus |
| آزمون/تحویل | تست‌ها، runner واقعی Chromium، restart، مستندات عملیاتی، قالب CI و PR #20؛ همه روی شاخهٔ جلسه |

### ۲۳٫۲ آخرین شواهد واقعی

- head آزموده‌شده `45dd2ad706015db4f41b6394f09c51976bafd5ef`؛ در این پیگیری تغییری در کد محصول انجام نشد.
- TypeScript هر دو پروژه + build production موفق؛ **506/506، صفر fail/skip**: فایل/نشر 24، V4 54، مدیریت 41، واحد 99، SQLite 38، provider contract 27، UI 42 و API 181.
- Chromium در اولین اجرای این بازبینی گذشت؛ **۲۰ تصویر تازه همگی واقعاً با ابزار تصویر باز شدند**. فارسی/انگلیسی/ترکی/روسی، موبایل/دسکتاپ، پنل سایت/مدیریت، Composer و Gate؛ بدون خطای ثبت‌شدهٔ JS/overflow. restart واقعی، ماندگاری فایل/metadata/Manus پیش‌فرض و خاموش‌ماندن ارسال را تأیید کرد.
- شواهد ignored: `tests/reports/current-request-*`، `current-request-summary.json` و `tests/e2e-browser/shots/v4/`. JSON/عکس‌ها دادهٔ fixture محلی‌اند؛ نه کاربر، کلید یا انتشار واقعی.
- PR #20 باز و سه check موجود روی head بالا موفق‌اند (run `34141810346`). این سه check معادل کل سوئیت محلی نیستند.

### ۲۳٫۳ باقی‌مانده و علت

1. **استقرار production / E.125:** dispatch تازه از شاخهٔ جلسه HTTP 403 داد. اتصال GitHub برای push/PR کار می‌کند ولی permission اجرای Actions/تغییر Workflow کافی نیست. مدیر باید PR #20 را بررسی/merge و مسیر مجاز Railway را اجرا کند، یا GitHub را در Arena با مجوزهای لازم دوباره متصل کند. هیچ credential در چت درخواست نشود؛ محدودیت با merge مخفی یا تغییر workflow دور زده نشود.
2. **CI کامل:** قالب `docs/publishing/publishing-v4.workflow.yml` آماده است ولی فعال‌سازی در `.github/workflows/` به مجوز/اقدام مدیر نیاز دارد؛ workflow فعال قبلی این نوبت جایگزین نشد.
3. **سلامت receiver واقعی / E.110:** درخواست مستقیم TLS/EOF و روش fetch جایگزین HTML عمومی سایت برگرداند، نه JSON گیرنده. پس از deploy، `GET /api/webhooks/zernio/health` باید `service: bazino-zernio-receiver` داشته باشد؛ صرف HTTP 200 یا ساخت subscription کافی نیست.
4. **تنظیم هاست / E.119:** Volume واقعی، فایل‌های اصلی، `BAZINO_DATA_DIR`، حفظ JWT نصب قبلی و `BAZINO_SECRETS_KEY`/کلیدهای سرویس از مسیر امن تأیید شوند. restart محلی، ماندگاری container واقعی هاست را اثبات نمی‌کند.
5. **راستی‌آزمایی زنده:** webhook.test امضاشده و سپس فقط با اجازه/محتوای مشخص، PR/DM و انتشار پست واقعی Zernio/Manus. فعلاً تست بیرونی mock است و هیچ اعتبار/پیام/پول واقعی مصرف نشده است.
6. **policy و محیط واقعی:** سیاست مالی/کوپن/کمپین و صف قبل از فعال‌سازی ارسال بررسی شوند؛ SQL Server/Mongo واقعی و مجوز Story/رفتار live نیز تست‌نشده‌اند.
7. **خارج از کار فعال:** SMTP و POS سخت‌افزاری متوقف، درگاه آنلاین خاموش. قابلیت هر عامل دلخواه بدون adapter و هر فرمت دلخواه رسانه وعده داده نمی‌شود؛ محدودیت‌های اجرایی در راهنماست.

### ۲۳٫۴ تحویل و ادامه

- مراجع جاری: `docs/publishing/V4_DELIVERY.md`، `DEPLOY_AND_OPERATE.md` و `V4_EXECUTION_LOG.md`. اصل سند کاربر و متن‌های چهارزبانه بدون تغییر محفوظ‌اند.
- شاخه فقط `arena/01a07a2f-bazino-gamenet-portal`؛ PR: https://github.com/paymanshafayan/bazino-gamenet-portal/pull/20 . همهٔ تغییرات مستندات طبق قانون ۳ commit/push و برابری HEAD ریموت بررسی می‌شوند؛ بدون نیاز به درخواست دوباره.
- ZIP/لاگ/تصویر، `.env` واقعی، دیتابیس runtime یا credential در Git قرار نگیرد؛ فایل manifest بسته ملاک commit دقیق آن است. کد انجام‌شده دوباره از صفر ساخته نشود؛ قدم بعد رفع permission/استقرار و آزمون live مجاز است.

## ۲۴. صفحهٔ «بازی‌ها» (/games) — تحویل جاری (2026-09-07)

- **محصول:** صفحهٔ عمومی `/games` با سه کارت چهارزبانهٔ KIDS / ADULTS / GAME REQUESTS؛ KIDS/ADULTS فیلتر واقعی `audience` روی سیستم‌ها هستند (خالی = در هر دو؛ دستهٔ خالی ← «فعلاً سیستمی در این دسته نیست») و همان جریان رزرو قبلی را باز می‌کنند (سیستم/کوپن/پرداخت بدون تغییر). درخواست بازی (اختیاری، ≤۸۰ نویسه، trim سرور) در لحظهٔ رزرو روی خود رزرو ذخیره می‌شود و در لیست کاربر، bookings ادمین، API چک‌اوت و بج کارت ایستگاه ادمین دیده می‌شود. تب «رزرو» حذف؛ `/reservations` alias دائمی `/games` است؛ Games جایگاه ۲ NAV_TABS (موبایل: خانه/بازی‌ها/کافه/فروشگاه/مسابقات + «بیشتر»). Events پنج‌تب، کافه/فروشگاه، گالری (اضافه‌نشده)، پروفایل/OTP/OSM/PayTR/بلاگ/چت/باشگاه: بدون تغییر.
- **فایل‌های کلیدی:** `shared/games.ts` (انواع + deep-link category)، `src/components/GamesTab.tsx` (سه کارت + جریان ماژول‌سطح — E.128)، `src/components/ReservationsTab.tsx` (audienceFilter + requestedGame + اسلات TZ کلوپ — E.129)، `server.ts` + `server/management/bookings.ts` (TZ کلوپ + requestedGame)، `server/management/tournaments.ts` (sampleFallback رویدادها — E.130)، `src/utils/routes.ts` (alias)، `src/App.tsx`/`NAV_TABS`، `shared/management/Stations.tsx`/`types.ts` (بج requestedGame)، `src/themes/README.md` (onNavigate('games') + بلوک ناوبری).
- **آزمون‌ها (همه در همین نوبت اجرا شده):** build production + tsc هر دو پروژه؛ کل سوئیت **۵۱۴/۵۱۴**؛ journey `tests/e2e-browser/e2e-journey.mjs` **۲۵/۲۵** روی DB تازه ( OTP dev-peek، TZ، مودال پرداخت حضوری، ثبت‌نام تورنمنت با انتخاب گزینهٔ غیرپر، موبایل)؛ سفر بصری `tests/e2e-browser/games-page.mjs` **۱۰/۱۰ بدون خطای کنسول**؛ هر ۱۰ تصویر `tests/e2e-browser/shots/games/` بازبینی چشمی شد. تصاویر طبق قرارداد ریپو gitignored هستند.
- **اجرای سفرهای مرورگر (پس از پاک‌شدن محیط):** `mkdir -p /home/user/browser-test && cp -r tests/e2e-browser/* /home/user/browser-test/` → `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci` → `node bootstrap.cjs --ready` → فونت‌ها به `/tmp/fonts/Vazirmatn` → اجرا با `CHROMIUM_EXECUTABLE_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023/lib FONTCONFIG_PATH=/tmp/fonts HOME=/tmp BASE=http://127.0.0.1:3000 node <script>.mjs`. سرور: `npx tsx server.ts` روی :3000. اگر server.ts عوض شد پیش از `npm test` حتماً `npm run build` (تست API از `dist/server.cjs` استفاده می‌کند).
- **باز:** پیشنهاد به‌روزرسانی §۰ برای `node scripts/prepare-media-tools.mjs` منتظر تأیید کاربر است؛ نویز از قبل (404 `/api/tournaments/t4/live`، embed OSM) بی‌اثر بر آزمون‌هاست؛ SMTP/POS متوقف، درگاه آنلاین خاموش — بدون تغییر.

## ۲۵. فهرست ۷موردی کارفرما — تحویل جاری (2026-09-08)

> نشست `arena/01a0800f-bazino-gamenet-portal` · پایه `37dde76` (merge PR #21). کامیت تحویل: `0de69f4` (پوش شد؛ PR به `main` در ادامهٔ همین پیگیری باز/مرج می‌شود). §۰ از قبل با تأیید کارفرما («انجام بده»، 2026-09-08) گام `prepare-media-tools` + سوئیت کامل را دارد، پس مورد «باز» انتهای §۲۴ بسته شد.

### ۲۵٫۱ تصمیم‌های کارفرما (قطعی، به ترتیب پیام)

1. **چت‌روم: حذف کامل از دید کاربر، بدون حذف کد** — کارفرما «حذف کامل» خواست؛ کاربر به «فقط غیرفعال + حذف از منو» تغییرش داد. اجرا: آیتم چت از `NAV_TABS` پورتال و NAV/تایل‌های هاب حذف شد؛ `ChatTab.tsx`، روت‌های سرور و مدیریت اتاق‌ها در ادمین دست‌نخورده؛ پرچم `chat_enabled` (پیش‌فرض `false`) در سفارشی‌سازی برمی‌گرداند؛ دسترسی مستقیم URL پنل «به‌زودی» می‌بیند.
2. **پیامک: بدون تغییر** — هیچ کدی دست نخورد.
3. **کردیت بازینو (BC) با خرج‌کردن کامل** (کاربر گزینهٔ full-spend را انتخاب کرد): موجودی `users.credits`؛ نمایش `Bazino Credits: N BC` در پروفایل؛ پرداخت رزرو با `POST /api/checkout/credits` به نرخ تخت زمانی (`gaming_credits_per_hour=100` → ۳۰ دقیقه = ۵۰ کردیت، اثبات‌شده با اجرای تابع)؛ قیمت کردیتی هر محصول (`creditPrice`) از کاتالوگ ادمین؛ شارژ دستی `POST /api/admin/credits/adjust` + فرم ادمین تا روش‌های کسب نهایی شود؛ ژورنال نوع `Credits`؛ لغو = بازگشت کردیت.
4. **باگ «مدیریت مشتریان» (E.131، رفع شد):** حذف یک گزینه، اطلاعات قبلی را تا افزودن گزینهٔ جدید پنهان می‌کرد. ریشه: پاسخ DELETE فقط لیست دیتابیس بود ولی UI از GET ادغام‌شده (sample+DB) تغذیه می‌شد. رفع در هر ۱۰ نقطه (سیستم/کافه/فروشگاه/تورنمنت/بلاگ/اسلایدر/چت): پس از mutation موفق، `fetchData()` از GET ادغام‌شده؛ قرارداد API عوض نشد.
5. **دستهٔ اضافهٔ کنسول** (فقط PS5/Xbox به انتخاب کاربر): پایه شامل ۲ دسته؛ هر اضافه `extra_controller_hourly=25` لیر/ساعت (+ معادل کردیتی ۲۰ BC)؛ استپر در `ReservationsTab` و `GamesPage` هاب؛ گارد سرور `EXTRA_CONTROLLERS_CONSOLE_ONLY`؛ تعداد در `reservation_logs.extraControllers` ذخیره می‌شود.
6. **کافه → فقط COMING SOON:** پرچم `food_coming_soon` (پیش‌فرض روشن)؛ کل مسیر سفارش سالم ماند برای فعال‌سازی آینده (تبلت/رستوران همکار، پرداخت به بازینو).
7. **فروشگاه → فقط COMING SOON:** پرچم `shop_coming_soon` (پیش‌فرض روشن) تا آماده‌شدن محصولات؛ هاب از قبل coming-soon بود.

### ۲۵٫۲ فایل‌های کلیدی

- بک‌اند: `server/dataProviders.ts` (ستون‌ها + مایگریشن هر دو SQL + `addCreditsToUser` هر سه پرووایدر)، `server/sampleData.ts` (۶ کلید تنظیمات + فیلدهای نمونه)، `server.ts` (کوت رزرو + legacy PUT/POST + `/api/admin/credits/adjust`)، `server/wallet/routes.ts` (`credits` در `METHODS_BY_KIND.reservation` + `/api/checkout/credits` + لغو)، `server/management/orders.ts` (`saveProduct`)، `server/accountRoutes.ts` (`publicUser`)، `src/types/gamenet.ts`، `src/themeSdk/sdk.ts`.
- فرانت: `src/legal/CheckoutModal.tsx` (متد credits + `estimateCreditsFromParams`)، `src/components/ReservationsTab.tsx` (استپر + نرخ‌ها)، `src/components/{CafeTab,ShopTab}.tsx` (پراپ `comingSoon`)، `src/components/ComingSoonPanel.tsx` (جدید، مشترک)، `src/App.tsx` (گیت چت + پراپ‌ها + `user.credits` تم)، `src/components/profile/*` (نمایش کردیت/ژورنال BC/لغو)، `src/components/AdminPanelTab.tsx` (فیکس باگ #۴ + سکشن ۴a پرچم/قیمت/شارژ)، `shared/management/Orders.tsx` (فیلد creditPrice کاتالوگ).
- هاب: `theme-packages/bazino-hub/theme.js` (حذف چت از NAV/تایل + گارد `CHAT DISABLED` + استپر EXTRA PADS + `user.credits` در Club)؛ ZIP با `npm run build:hub-theme` ری‌بیلد و راستی‌آزمایی شد (gitignored طبق قاعده).
- تست: `tests/unit.test.mts` سوئیت ۱۶ (۱۳ تست) + اصلاح `METHODS_BY_KIND.reservation`.

### ۲۵٫۳ آزمون‌های واقعاً اجراشده در این نشست

- `npx tsx tests/unit.test.mts` → **۱۱۶/۱۱۶** ✅ · `providers` ۲۷/۲۷ ✅ · `ui` (jsdom) ۴۵/۴۵ ✅ · `tsc --noEmit` صفر خطا ✅ · `vite build` ✅ · باندل سرور esbuild ✅ (هشدارهای import.meta از قبل) · ریاضی کردیت با اجرای واقعی تابع (۲h→۲۰۰، ۳۰min→۵۰، ۲h+۲دسته→۲۸۰، عبور نیمه‌شب) ✅ · `theme.js` داخل ZIP: پارس OK، بدون `/chat` در NAV/تایل ✅.
- **اجرا نشد (محدودیت سندباکس، نه رگرسیون):** سوئیت‌های `api`/`publishing*`/`management`/`database` به باینری native `better-sqlite3` نیاز دارند که در این محیط ساخته نشد (۷۰ خطای `fetch failed` محیطی، دقیقاً همان محدودیت ثبت‌شدهٔ قبلی). **پیش از تحویل به کارفرما روی محیط واقعی لازم است:** پرداخت کردیتی رزرو، استپر دسته (پورتال+هاب)، پرچم‌های coming-soon، شارژ کردیت از ادمین، و رگرسیون کامل `npm test`.
- SMTP/POS متوقف، درگاه آنلاین خاموش — بدون تغییر. فایل‌های تسک UI قبلی (bubble دانلود اپ، رمز OTP-only، فوتر) در کامیت جدا ثبت شدند (۲۵٫۴).

### ۲۵٫۴ کامیت‌های این برنچ

| SHA | چه شد |
|---|---|
| `23586b6` | Hub theme: موتور `layout=hub` + سورس پکیج + بیلدر (تحویل قبلی همین نشست) |
| `0de69f4` | فهرست ۷موردی کارفرما (۲۱ فایل، این بخش) |
| (بعدی) | فایل‌های تسک UI قبلی + همین به‌روزرسانی اسناد، سپس PR و مرج به `main` |

### ۲۵٫۵ کار بعدی

1. مرج PR همین برنچ در `main` (پایهٔ تمیز روی `37dde76`؛ تداخل انتظار نمی‌رود) و راستی‌آزمایی سبزبودن چک‌های CI روی مرج.
2. رگرسیون زندهٔ موارد §۲۵٫۳ روی محیط واقعی (سرور + مرورگر) پیش از اعلام تحویل به کارفرما.
3. بازها بدون تغییر: استقرار production/receiver (E.110/E.125)، Volume هاست (E.119)، تماس‌های زندهٔ Zernio/Manus/Messaggio، SQL/Mongo واقعی، GTmetrix واقعی.

### ۲۵٫۶ تأیید استقرار production (2026-09-09)

> نشست `arena/01a084c6-bazino-gamenet-portal`. مدیر دیپلوی `main` (مرج PR #22، کامیت `eeccfd8`) را اجرا و سبز اعلام کرد؛ راستی‌آزمایی GET از بیرون سندباکس (curl مستقیم سندباکس به bazino.pro همچنان `SSL_ERROR_SYSCALL` می‌دهد، ولی fetch بیرونی موفق است):

- `GET /api/webhooks/zernio/health` → `{"ok":true,"service":"bazino-zernio-receiver"}` ✅ (گیرندهٔ V4 مستقر است و Secret روی هاست ست شده؛ وگرنه `ok:false` + 503 بود)
- `GET /api/payments/config` → `{"enabled":false,"onlineDisabled":true,...}` ✅ (کد جدید سروشده و درگاه آنلاین با نبود `PAYMENT_ONLINE_ENABLED` درست خاموش است)
- `GET /games` → صفحهٔ §۲۴ با سه کارت KIDS/ADULTS/GAME REQUESTS ✅
- **باز:** `webhook.test` امضاشده (POST، از سندباکس به‌خاطر بلاک شبکه ممکن نیست — مدیر با دستور §۲۵٫۷ از لوکال اجرا کند)؛ رگرسیون تعاملی §۲۵ (پرداخت BC، استپر دسته، شارژ ادمین)؛ تماس‌های زندهٔ Zernio/Manus/Messaggio.

### ۲۵٫۷ دستور `webhook.test` برای اجرای مدیر از لوکال (سکرت را در چت نگذارید)

```bash
SECRET='<ZERNIO_WEBHOOK_SECRET از هاست>'
BODY='{"event":"webhook.test","ping":1}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -sS -m 15 -X POST https://bazino.pro/api/webhooks/zernio \
  -H 'Content-Type: application/json' \
  -H "x-zernio-signature: sha256=$SIG" \
  -d "$BODY"
# انتظار: پاسخ بی‌اثر با outboundSent:false و بدون ساخت پیام/کوپن/کد

معادل PowerShell (ویندوز — بدون نیاز به openssl، خروجی‌اش را در چت بفرستید، نه خود سکرت):

```powershell
$Secret = '<ZERNIO_WEBHOOK_SECRET از هاست>'
$Body = '{"event":"webhook.test","ping":1}'
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [Text.Encoding]::UTF8.GetBytes($Secret)
$sig = ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($Body)) | ForEach-Object { $_.ToString('x2') }) -join ''
Invoke-RestMethod -Uri 'https://bazino.pro/api/webhooks/zernio' -Method Post -ContentType 'application/json' -Headers @{ 'x-zernio-signature' = "sha256=$sig" } -Body $Body
# انتظار: ok=True, outboundSent=False, test=True
```
## ۲۶. پرامپت کمپین تلگرام Manus — پلن نوشته شد، اجرا نشده (2026-09-09)

> نشست `arena/01a084c6-bazino-gamenet-portal`. پرامپت «ایجنت پورتال بازینو» از Manus برای کمپین تبلیغاتی تلگرام به‌صورت **متن در چت** دریافت شد (فایل attach به فضای کاری نرسید). به دستور مالک خوانده و تحلیل شد ولی **اجرا نشد**. پلن تطبیق‌یافته در **`docs/manus/TELEGRAM_CAMPAIGN_PLAN.md`** نوشته شد؛ اجرا فقط با «شروع کن».

- تصمیم‌های مالک (قطعی): (۱) تأیید انسانی هر ارسال لازم نیست — تأیید یک‌بار کمپین کافی است؛ (۲) Manus فقط از این درگاه پورتال استفاده کند؛ (۳) اختیار کامل فیلتر ارسال‌ها با ایجنت.
- انحراف‌های تطبیق از پرامپت Manus: پورتال Express (نه FastAPI)؛ تأیید یک‌بار کمپین (text-hash + حصار + سقف + انقضا) به‌جای تأیید هر draft؛ endpoint ارسال روی Gateway؛ هر سه باید به Manus هم اعلام شود.
- نقاط reuse تأییدشده در کد: توکن `baz_` (`server/affiliate/igRoutes.ts`)، `verifyHmac` (`server/publishing/webhooks.ts`)، `requireAdmin` (`server.ts:828`)، `core.command`/`core.audit`، `AffiliateService.report` (`server/management/affiliates.ts`)، `SecretVault`. هیچ `/api/manus/*` از قبل نیست؛ اتوماسیون تلگرام از قبل نیست (فقط لینک‌های شبکه اجتماعی در محتوا).
- ریسک اصلی: spam-ban اکانت تلگرام (متوسط با حصار §۵ پلن) — پذیرش با مالک. پیش‌فرض: readonly و بدون ارسال واقعی.
- موازی: دیپلوی Mongo با `--replSet rs0` در صف Railway بود (boot همچنان ۳ سپتامبر)؛ قدم بعدی آن پس از سبز شدن: `setName` → `rs.initiate` با هاست داخلی → تست اکشن استودیو + webhook.test.

