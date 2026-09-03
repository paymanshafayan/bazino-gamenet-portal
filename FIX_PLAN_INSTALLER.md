# پلن — ساخت و تحویل نصاب واقعی نسخه‌ی دسکتاپ

**وضعیت:** پیش‌نویس — منتظر «شروع کن». **هیچ کد محصولی هنوز تغییر نکرده است.**
**هدف کاربر:** مدیر سایت بتواند از داخل پنل، نصاب دسکتاپ را دانلود و نصب کند.

---

## ۰. وضعیت امروز

زیرساخت از قبل هست و کار می‌کند، فقط **فایل نصاب وجود ندارد**:

| قطعه | وضعیت |
|---|---|
| `GET /api/desktop/availability` | ✅ پوشه‌ی `desktop-builds/<platform>/` را چک می‌کند |
| `GET /api/desktop/download/:platform` | ✅ اولین فایل همان پوشه را می‌فرستد |
| دکمه‌های دانلود در پنل | ✅ `SettingsThemesModal.tsx:32` — اگر نبود، «(به‌زودی)» غیرفعال نشان می‌دهد |
| `desktop-builds/windows|mac|linux/` | ❌ **خالی — هیچ نصابی ساخته نشده** |
| ساخت نصاب در sandbox | ❌ Electron نصب‌شدنی نیست (باینری از GitHub Releases، بسته) |

---

## ۱. چرا «commit کردن نصاب در ریپو» جواب نمی‌دهد

سه مانع مستقل:

1. **سقف حجم گیت‌هاب:** هر فایل بیش از ۱۰۰MB رد می‌شود. نصاب ویندوز الکترون با Node و
   Chromium و `better-sqlite3` معمولاً **۹۰ تا ۱۸۰MB** است — درست روی مرز یا بالاتر.
2. **حجم ریپو:** سه پلتفرم × هر انتشار = چند صد مگابایت که **برای همیشه** در تاریخچه می‌ماند.
3. **دیپلوی Railway:** فایل‌سیستم ephemeral است؛ هر چیزی که سرو می‌شود باید داخل ایمیج باشد،
   یعنی نصاب‌ها به ایمیج دیپلوی هم اضافه می‌شوند و هر بار push، چند صد مگابایت جابه‌جا می‌شود.

> خودِ `desktop-builds/README.md` هم همین را پیش‌بینی کرده:
> «شاید ترجیح بدید به‌جاش از GitHub Releases یا CDN استفاده کنید و این routeها رو به اونجا redirect کنید.»

---

## ۲. طراحی پیشنهادی — CI می‌سازد، Release میزبانی می‌کند، سرور هدایت می‌کند

```
   GitHub Actions                    GitHub Release                 سرور بازینو
┌──────────────────┐            ┌────────────────────┐         ┌──────────────────┐
│ windows-latest   │  آپلود     │ desktop-v1.0.0     │  302    │ /api/desktop/    │
│ macos-latest     │ ─────────► │  BAZINO-Setup.exe  │ ◄────── │   download/win   │
│ ubuntu-latest    │            │  BAZINO.dmg        │         │                  │
└──────────────────┘            │  BAZINO.AppImage   │         │ availability از  │
   electron-builder             └────────────────────┘         │ Releases API     │
```

هر سه runner **رایگان‌اند** (ریپو public است) و هر پلتفرم روی سیستم‌عامل خودش build می‌شود —
که برای ماژول native `better-sqlite3` **اجباری** است (کراس‌کامپایل قابل‌اتکا نیست).

### تغییرات لازم در سرور (کوچک و برگشت‌پذیر)

`server.ts` — دو مسیر موجود، با حفظ کامل رفتار فعلی به‌عنوان اولویت اول:

1. **`/api/desktop/download/:platform`**
   * اگر فایلی در `desktop-builds/<platform>/` بود → مثل امروز همان را بفرست (بدون تغییر).
   * وگرنه → آخرین GitHub Release را از `api.github.com` بگیر، asset مناسب آن پلتفرم را
     پیدا کن و **`302` به آدرسش** بده. مرورگر مدیر مستقیم از گیت‌هاب دانلود می‌کند.
   * اگر Release هم نبود → همان ۴۰۴ فارسی فعلی.

2. **`/api/desktop/availability`**
   * همان چک پوشه، **به‌علاوه‌ی** assetهای آخرین Release.
   * نتیجه با TTL ~۱۰ دقیقه cache شود تا هر بار باز شدن پنل به گیت‌هاب درخواست نزند.
   * اگر گیت‌هاب در دسترس نبود، `false` برگردانده شود (رفتار امروز) نه خطا.

3. **قابل پیکربندی:** مخزن Releases از تنظیمات خوانده شود
   (`desktop_release_repo`، پیش‌فرض `paymanshafayan/bazino-gamenet-portal`) تا اگر روزی
   مخزن جدا شد، بدون تغییر کد قابل تنظیم باشد.

### تغییر در پنل

دکمه‌ها همان‌ها می‌مانند. فقط **شماره‌ی نسخه و حجم فایل** کنار هر دکمه نشان داده می‌شود
(از همان پاسخ availability) تا مدیر بداند چه چیزی دانلود می‌کند.

---

## ۳. آنچه از شما لازم است — یک فایل ورک‌فلو

من اجازه‌ی نوشتن در `.github/workflows/` را ندارم. محتوای کامل YAML در چت داده می‌شود؛
فایل `.github/workflows/desktop-installers.yml` سه job دارد:

| job | runner | خروجی |
|---|---|---|
| `build-windows` | `windows-latest` | `BAZINO-PRO-Setup-<v>.exe` (NSIS) + نسخه‌ی portable |
| `build-mac` | `macos-latest` | `BAZINO-PRO-<v>.dmg` |
| `build-linux` | `ubuntu-latest` | `BAZINO-PRO-<v>.AppImage` |
| `release` | `ubuntu-latest` | هر سه را به یک GitHub Release می‌چسباند |

هر job این مراحل را دارد: `npm ci` در ریشه → `npm run build` → `npm ci` در `desktop-app`
(تا Electron و `@electron/rebuild` نصب شوند) → `npm run prepare-server-bundle`
(که حالا `@electron/rebuild` را هم اجرا می‌کند چون Electron موجود است) → `electron-builder`.

اجرا با `workflow_dispatch` **دستی** خواهد بود، نه روی هر push — چون هر بار حدود ۱۵ دقیقه از
سه runner می‌گیرد.

---

## ۴. ⚠️ امضای دیجیتال — چیزی که باید از قبل بدانید

نصاب‌های ساخته‌شده **بدون امضا** خواهند بود، مگر اینکه گواهی تهیه کنید:

| سیستم‌عامل | تجربه‌ی کاربر بدون امضا | راه‌حل |
|---|---|---|
| ویندوز | صفحه‌ی آبی **SmartScreen**: «Windows protected your PC» → کاربر باید «More info → Run anyway» بزند | گواهی Code Signing (OV ~۲۰۰-۴۰۰ دلار در سال، EV گران‌تر ولی SmartScreen را فوراً پاک می‌کند) |
| مک | **Gatekeeper** اجرا را مسدود می‌کند: «cannot be opened because the developer cannot be verified» → کاربر باید راست‌کلیک → Open بزند | Apple Developer Program (۹۹ دلار در سال) + notarization |
| لینوکس | AppImage بدون هشدار اجرا می‌شود (فقط `chmod +x`) | لازم نیست |

**پیشنهاد من:** فعلاً بدون امضا شروع کنیم و یک راهنمای کوتاه فارسی کنار دکمه‌ی دانلود بگذاریم که
دقیقاً بگوید کاربر چه پیامی می‌بیند و چه کند. هر وقت گواهی گرفتید، فقط دو secret به ورک‌فلو
اضافه می‌شود و همان workflow نصاب‌های امضاشده تولید می‌کند. **این نیاز به تصمیم شماست.**

---

## ۵. معیار پذیرش

1. اجرای دستی ورک‌فلو → یک GitHub Release با **هر سه** asset ساخته شود.
2. `GET /api/desktop/availability` هر سه پلتفرم را `true` با نسخه و حجم برگرداند.
3. `GET /api/desktop/download/windows` یک `302` به آدرس asset بدهد و دانلود واقعاً شروع شود.
4. دکمه‌های پنل فعال شوند و نسخه/حجم را نشان دهند.
5. اگر Release وجود نداشته باشد، رفتار امروز حفظ شود: دکمه‌ی غیرفعال «(به‌زودی)» و ۴۰۴ فارسی.
6. اگر فایلی به‌صورت دستی در `desktop-builds/` گذاشته شود، **همان** اولویت داشته باشد.
7. بدون رگرسیون: `npm test` سبز، بوت co-located و دسکتاپ سالم.

---

## ۶. آنچه من نمی‌توانم تأیید کنم

خودِ نصاب روی ویندوز/مک اجرا نمی‌شود تا من ببینم. من می‌توانم تأیید کنم که ورک‌فلو سبز شد،
assetها ساخته و آپلود شدند، و مسیرهای سرور درست هدایت می‌کنند. **نصب واقعی و باز شدن پنجره‌ی
اپ روی یک دستگاه ویندوز، حتماً باید توسط شما تست شود** — و نتیجه‌اش را در همین سند ثبت می‌کنم.

---

# نتیجه‌ی اولین اجرای واقعی — ۱۴۰۵/۰۶/۱۱

ورک‌فلو توسط کاربر اضافه شد و با یک push زیر `desktop-app/` توسط من اجرا شد (run `33673142196`).

| runner | نتیجه | مرحله‌ی شکست |
|---|---|---|
| **macos-latest** | ✅ **موفق** | — نصاب `.dmg` ساخته شد |
| windows-latest | ❌ | `Build the site and the server bundle` |
| ubuntu-latest | ❌ | `Build the installer` (electron-builder) |
| release | ⏭️ رد شد (چون build کامل نبود) |

> دانلود لاگ از این sandbox بسته است؛ فقط وضعیت استپ‌ها و annotationها خواندنی‌اند
> (`Process completed with exit code 1`). تشخیص زیر بر پایه‌ی خواندن خودِ اسکریپت‌هاست، نه حدس.

## ۱. 🔴 `npm run build` روی ویندوز اصلاً کار نمی‌کند

```json
"build": "vite build && (cd 'Management App/Bazino' && npm install && npm run build) && esbuild ..."
```

`npm run` روی ویندوز دستور را به **`cmd.exe`** می‌دهد، و cmd کوتیشن تکی را به‌عنوان کوتیشن مسیر
نمی‌شناسد: `cd 'Management App/Bazino'` به `cd 'Management` تبدیل می‌شود و مسیر پیدا نمی‌شود.

این فقط مشکل CI نیست — **هیچ توسعه‌دهنده‌ای روی ویندوز نمی‌تواند این پروژه را build کند.**

**تغییر پیشنهادی:** حذف کامل subshell و کوتیشن، با فلگ خودِ npm که روی هر سه سیستم‌عامل یکسان است:

```json
"build": "vite build && npm --prefix \"Management App/Bazino\" install && npm --prefix \"Management App/Bazino\" run build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs"
```

## ۲. 🟠 لینوکس: باندل بیش از حد بزرگ است

`prepare-server-bundle.js` بعد از تغییر من، **کل `node_modules` ریشه** را کپی می‌کند — که
شامل devDependencies هم هست (`vite`, `typescript`, `esbuild`, `@types/*` و…). آن پوشه بعد
به‌عنوان `extraResources` داخل نصاب بسته‌بندی می‌شود.

دلیل آن تغییر، آفلاین‌بودن sandbox بود. ولی **روی CI شبکه هست**، پس ترتیب باید برعکس شود:

1. اول `npm install --omit=dev` (درست و فقط production)،
2. و فقط اگر شبکه نبود، کپی از `node_modules` ریشه به‌عنوان fallback.

به‌علاوه هنگام کپی، `node_modules/.bin` (که پر از symlink است) و `.cache` کنار گذاشته شوند.

## ۳. 🟡 دیدن خطا نباید به لاگ وابسته باشد

چون دانلود لاگ در این محیط ممکن نیست، هر شکست بعدی هم کور خواهد بود. راه‌حل: در ورک‌فلو یک
استپ `if: failure()` که خروجی مرحله‌ی شکست‌خورده را در `DESKTOP_BUILD_REPORT.md` بنویسد و
مثل گزارش فلاتر به برنچ commit کند.

## معیار پذیرش

1. هر سه runner سبز شوند.
2. job `release` اجرا شود و Release با هر سه asset ساخته شود.
3. `npm run build` روی ویندوز کار کند (با همان تغییر package.json).
4. حجم نصاب منطقی باشد (بدون devDependencies).
5. بدون رگرسیون: `npm test` سبز و بوت co-located و دسکتاپ سالم.

---

## ⚠️ رگرسیونی که خودم ساختم و باید همین‌جا اعلام کنم

ورک‌فلوی `Backend & Frontend Build + Tests` هم قرمز شد — **تقصیر تغییر من در Batch E**.
آن تغییر، بوت در `NODE_ENV=production` بدون `JWT_SECRET` را عمداً کشنده کرد، و مرحله‌ی
smoke-test دقیقاً همان کار را می‌کند:

```yaml
NODE_ENV=production PORT=3456 node dist/server.cjs > server.log 2>&1 &
```

بازتولید محلی:

```
$ NODE_ENV=production PORT=3456 node dist/server.cjs
[Security] JWT_SECRET is not set. Refusing to start in production: ...

$ NODE_ENV=production JWT_SECRET=ci PORT=3457 node dist/server.cjs
[BAZINO Backend Server] is running beautifully with SQLite on http://0.0.0.0:3457   ✅
```

**رفتار سرور درست است** (سروری که در production بدون راز بالا بیاید، توکن ادمینش جعل‌شدنی است)؛
چیزی که باید عوض شود خودِ ورک‌فلو است: یک `JWT_SECRET` یک‌بارمصرف برای smoke-test.
چون اجازه‌ی ویرایش `.github/workflows/*` را ندارم، اصلاحش در چت داده می‌شود.

## نتیجه‌ی اصلاح دور دوم — ۱۴۰۵/۰۶/۱۲

با تأیید «شروع کن» اصلاحات زیر انجام شد:

- اسکریپت `build` ریشه از `cd` با single quote به `npm --prefix` تغییر کرد؛ بنابراین مسیر دارای فاصله در Windows هم درست اجرا می‌شود.
- `desktop-app/package.json` برای ساخت `.deb` دارای `homepage`، ایمیل author و maintainer شد.
- `prepare-server-bundle.js` ابتدا فقط وابستگی‌های production را داخل bundle نصب می‌کند تا devDependencies وارد installer نشوند؛ در محیط آفلاین، کپی کنترل‌شده‌ی `node_modules` ریشه fallback است.
- بررسی بارگذاری `better-sqlite3` بعد از آماده‌سازی bundle حفظ شد.
- `npm run build` محلی موفق شد.
- `node desktop-app/scripts/prepare-server-bundle.js` موفق شد؛ در sandbox نصب npm به‌علت عدم دسترسی به Node headers شکست خورد و fallback آفلاین استفاده شد.
- `npm test`: **241/241 سبز**.

فایل workflow عمداً توسط agent تغییر داده نشد؛ طبق محدودیت GitHub App، اصلاح diagnostics باید توسط مالک workflow اعمال شود. برای اجرای مجدد، push تغییرات desktop-app کافی است. خطای `JWT_SECRET` در workflow جداگانه‌ی build-test همچنان نیازمند اضافه‌شدن secret موقت CI در همان workflow است.
