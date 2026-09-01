# تست مرورگری (Playwright + Chromium) در sandbox آرش

> این سند راهکارِ برداشته‌شده از `IGBZ-WP/HANDOFF-PROMPT.md` (بخش «محیط Playwright + Chromium» و
> جدول عیب‌یابی §۸) را برای پروژه‌ی بازینو ثبت می‌کند. در ۱۴۰۵/۰۶/۱۰ روی همین sandbox تأیید شد.
> **نتیجه: نصب Chromium روی sandbox کاملاً ممکن است؛ فرض قبلیِ «ممکن نیست» غلط بود.**

---

## ۱. محدودیت شبکه‌ی sandbox

در این محیط معمولاً **فقط `registry.npmjs.org`** باز است و این دامنه‌ها بلاک‌اند:

- `cdn.playwright.dev`
- `playwright.azureedge.net`
- `registry.npmmirror.com`
- `deb.debian.org`
- `storage.googleapis.com`
- `wordpress.org`
- `nodejs.org` (مهم برای `node-gyp`/`better-sqlite3`)

در نتیجه `npx playwright install` شکست می‌خورد. (برای `better-sqlite3` راه‌حل کامل در بخش ۶ آمده — بدون نیاز به شبکه.)

---

## ۲. راه‌حل: باینری Chromium از کانال npm

بسته‌ی **`@sparticuz/chromium`** باینری Chromium + کتابخانه‌های اشتراکی (al2023) + فونت‌ها را همه داخل
تاربال npm نگه می‌دارد؛ بنابراین به هیچ CDN پلی‌رایت نیاز ندارد.

نسخه‌های پین‌شده و تست‌شده (Chromium `149.0.7827.0`):

```
playwright@1.62.1
@playwright/test@1.62.1
@sparticuz/chromium@149.0.0
```

---

## ۳. راه‌اندازی محیط (`/home/user/browser-test`)

```bash
mkdir -p /home/user/browser-test && cd /home/user/browser-test

cat > package.json <<'EOF'
{
  "name": "bazino-browser-test",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "description": "Playwright + Chromium environment for sandbox visual testing.",
  "scripts": {
    "verify": "node verify-env.mjs",
    "crawl": "node crawl-bazino.mjs"
  },
  "dependencies": {
    "@playwright/test": "1.62.1",
    "@sparticuz/chromium": "149.0.0",
    "playwright": "1.62.1"
  }
}
EOF

# فقط نصب پکیج‌ها؛ مرورگر دانلود نمی‌شود
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund
```

### `bootstrap.cjs` — استخراج idempotent (نسخه‌ی CJS، سازگار با chromium@149 ESM)

```js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

const pkgRoot = path.join(__dirname, 'node_modules', '@sparticuz', 'chromium');
const binDir = path.join(pkgRoot, 'bin');
const TMP = os.tmpdir();
const CHROMIUM = path.join(TMP, 'chromium');
const AL2023_LIB = path.join(TMP, 'al2023', 'lib');
const FONTS = path.join(TMP, 'fonts');

process.env.CHROMIUM_EXECUTABLE_PATH = CHROMIUM;
process.env.FONTCONFIG_PATH = process.env.FONTCONFIG_PATH || FONTS;

function setEnv() {
  const parts = [AL2023_LIB, process.env.LD_LIBRARY_PATH].filter(Boolean);
  process.env.LD_LIBRARY_PATH = parts.join(':');
  process.env.HOME = process.env.HOME || TMP;
}

function loadChromium() {
  // chromium@149 کاملاً ESM است؛ از CJS با dynamic import لود می‌شود.
  return import(pathToFileURL(path.join(pkgRoot, 'build', 'index.js')).href);
}

async function inflateAl2023() {
  if (fs.existsSync(AL2023_LIB)) return;
  const { inflate } = await loadChromium();
  await inflate(path.join(binDir, 'al2023.tar.br'));
}

async function main() {
  await inflateAl2023();
  setEnv();
  const chromium = await loadChromium();
  const browser = await chromium.default.executablePath(binDir);
  if (!fs.existsSync(browser) || !fs.existsSync(AL2023_LIB)) process.exit(1);
  const mode = process.argv[2] || '';
  if (mode === '--ready') process.exit(0);
  if (mode === '--browser') { console.log(browser); return; }
  console.log('READY');
  console.log(`CHROMIUM=${browser}`);
  console.log(`LD_LIBRARY_PATH=${process.env.LD_LIBRARY_PATH}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

### `verify-env.mjs` — راستی‌آزمایی محیط

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import Chromium from '@sparticuz/chromium';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!String(process.env.LD_LIBRARY_PATH || '').split(':').includes('/tmp/al2023/lib')) {
  process.env.LD_LIBRARY_PATH = ['/tmp/al2023/lib', process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
}
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH ||
  (await Chromium.executablePath(path.join(__dirname, 'node_modules', '@sparticuz', 'chromium', 'bin')));

const browser = await chromium.launch({ executablePath, headless: true, args: Chromium.args });
try {
  const page = await browser.newPage();
  await page.setContent('<html><body><h1>hello bazino</h1></body></html>');
  const title = await page.textContent('h1');
  console.log(`OK: browser=${browser.version()} h1=${title}`);
  mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  await page.screenshot({ path: path.join(__dirname, 'shots', 'verify.png'), fullPage: true });
} finally {
  await browser.close();
}
```

---

## ۴. نکات مهم

- **`npx playwright install` هرگز اجرا نشود** — CDN بلاک است.
- **`@sparticuz/chromium@149` کاملاً ESM شده**: `build/cjs/` دیگر نیست؛ از `import(...)` داینامیک استفاده کن.
- **`al2023.tar.br` (libهای مثل `libnspr4.so`) فقط در Amazon Linux 2023 خودکار باز می‌شود**؛ در این sandbox باید دستی `inflate` شود (در `bootstrap.cjs` انجام شده).
- نسخه‌ی `node_modules` و `/tmp` **بین جلسات پاک می‌شود**؛ برای بازسازی:
  ```bash
  cd /home/user/browser-test
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
  node bootstrap.cjs
  ```
- اگر بینایی تصویر در جلسه‌ای خاموش بود، همان‌طور که در `IGBZ-WP` گفته شده، تحلیل بصری را با DOM/CSS انجام بده (`getBoundingClientRect`، استایل محاسبه‌شده، overflow، خطاهای console).

---

## ۵. ترتیب کار برای تست بصری بازینو

```bash
# ۱) بیلد فرانت‌اند (بدون نیاز به native module ها)
cd /home/user/bazino-gamenet-portal
npm install --ignore-scripts --no-audit --no-fund
npx vite build

# ۲) سرو بیلد استاتیک
python3 -m http.server 4173 --bind 0.0.0.0 --directory dist &

# ۳) اسکرین‌شات با Chromium واقعی
cd /home/user/browser-test
node crawl-bazino.mjs http://127.0.0.1:4173 /home/user/bazino-gamenet-portal/visual-testing
```

نمونه‌ی خروجی روی همین sandbox (۱۴۰۵/۰۶/۱۰):

- `browser=149.0.7827.0` ✅
- DOM read-back ✅
- Screenshot تمام‌صفحه ✅
- دسکتاپ و موبایل بدون overflow افقی ✅

---

## ۶. ~~محدودیت باقی‌مانده~~ → حل شد: سرور زنده در sandbox (۱۴۰۵/۰۶/۱۰)

> **این بخش قبلاً می‌گفت بوت کامل `server.ts` ممکن نیست. آن نتیجه‌گیری غلط بود.**

`better-sqlite3` فقط وقتی به `nodejs.org` نیاز دارد که node-gyp بخواهد هدرهای Node را **دانلود** کند.
اما هدرها **از قبل روی ایمیج نصب‌اند**:

```
/usr/local/include/node/node_version.h  → NODE_MAJOR 22 · MINOR 22 · PATCH 3  (هم‌نسخه با runtime)
/usr/local/include/node/common.gypi
g++ 12.2.0 · make · python 3.11        → همه موجود
```

پس کافی است node-gyp را به همان مسیر وصل کنیم:

```bash
cd /home/user/bazino-gamenet-portal
npm install --ignore-scripts --no-audit --no-fund
cd node_modules/better-sqlite3
npx node-gyp rebuild --release --nodedir=/usr/local        # ~۷۰ ثانیه، بدون هیچ دانلودی
node -e "const D=require('better-sqlite3'); new D(':memory:'); console.log('SQLITE OK')"
```

سپس سرور واقعی بالا می‌آید:

```bash
cd /home/user/bazino-gamenet-portal && npx tsx server.ts
# [Database Engine] Active provider initialized: SQLite
# [BAZINO Backend Server] is running beautifully with SQLite on http://0.0.0.0:3000
```

`vite.config.ts` از قبل `allowedHosts: ['.e2b.app', '.localhost']` دارد و `server.ts` در حالت dev
`allowedHosts: true` می‌دهد، پس preview زنده‌ی sandbox بدون تغییر کار می‌کند.
همه‌ی `/api/*` واقعی‌اند و دیگر خطای 404 وجود ندارد.

---

## ۷. فونت فارسی در Chromium سندباکس

`@sparticuz/chromium` فقط `Open Sans` را همراه دارد؛ بدون فونت عربی/فارسی، **تمام متن فارسی
در اسکرینشات‌ها خالی رندر می‌شود** (لاتین سالم است — همین باعث اشتباه‌گیری می‌شود).
راه‌حل بدون CDN، چون فونت روی npm منتشر شده است:

```bash
cd /home/user/browser-test
npm i vazirmatn
mkdir -p /tmp/fonts/Vazirmatn
cp node_modules/vazirmatn/fonts/ttf/*.ttf /tmp/fonts/Vazirmatn/
rm -rf /tmp/fonts-cache          # fontconfig کش را بازسازی کند
```

(`/tmp/fonts/fonts.conf` که `bootstrap.cjs` می‌سازد، از قبل `<dir>/tmp/fonts</dir>` دارد.)

---

## ۸. بلاک‌کردن منابع خارجی در هارنس (اجباری)

سایت در زمان اجرا `fonts.googleapis.com` را صدا می‌زند. چون آن دامنه در sandbox بلاک است،
`page.screenshot()` در حالت «waiting for fonts to load» **۳۰ ثانیه تایم‌اوت می‌خورد**.
در `lib.mjs` این دامنه‌ها abort می‌شوند:

```js
const EXTERNAL = /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|api\.qrserver\.com|api\.dicebear\.com|openstreetmap\.org|unpkg\.com|cdnjs\./;
await context.route(EXTERNAL, (route) => route.abort());
```

---

## ۹. هارنس سناریوهای E2E

اسکریپت‌ها در `tests/e2e-browser/` ریپو نگهداری می‌شوند (چون `/home/user/browser-test`
بین جلسات پاک می‌شود) — کافی است در آن پوشه کپی شوند:

| فایل | کار |
|---|---|
| `lib.mjs` | لانچر مشترک Chromium + بلاک CDN + جمع‌آوری خطاهای console |
| `explore.mjs` / `explore-tabs.mjs` | نقشه‌برداری DOM هر تب (دکمه‌ها، فیلدها، هدینگ‌ها) |
| `e2e-journey.mjs` | سفر کامل کاربر: ثبت‌نام → رزرو → کافه → فروشگاه → تورنمنت → باشگاه |
| `e2e-part2.mjs` | مودال‌ها، موبایل ۳۹۰px، بلاگ/چت، `/app-download`, `/install`, ورود ادمین |
| `e2e-admin.mjs` | جاروب هر ۱۶ بخش پنل مدیریت با اسکرینشات |

نتایج آخرین اجرا: `E2E_TEST_REPORT.md` و `visual-testing/e2e-2026-09-01/`.
