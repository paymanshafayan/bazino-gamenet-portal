# رفع ۵۲۴ نصب قالب‌های پر-asset — نصب async با Job (202)

**تاریخ:** ۲۰۲۶-۰۹-۱۲ • **قالب هدف:** `bazino-arena3d` v1.0.0 (ZIP واقعی 10.63MB / 405 entry / 394 فریم WebP + manifest + 7 تصویر پورتال-منو)

---

## ۱) علت ریشه‌ای (با شواهد زمان‌سنجی واقعی)

بنچمارک فاز‌به‌فاز روی ZIP واقعی (`/tmp/theme-bench.mts`، SSD لوکال):

| فاز | زمان |
|---|---|
| parse (unzip 402 asset) | 81ms |
| validate | 0ms |
| static optimize | 2ms |
| sharp (فقط ۷ jpg) | 467ms |
| write-loop ترتیبی | 25ms |
| rescan | 0ms |
| **کل installThemeZip** | **~0.6s (لوکال)** |

کد لوکال مشکل نداشت؛ مشکل **طراحی تک-درخواستی** بود: روی Railway با volume شبکه‌ای، همین write-loop ترتیبی + I/O کند چند ده ثانیه طول می‌کشد و Cloudflare بعد از ~۱۰۰ ثانیه پاسخ **524** می‌داد (سابقه: حادثهٔ قالب 25MB در کامنت `themePerformance.ts`).

**دو بلاکر دیگر هم این قالب را کلاً رد می‌کردند:**
1. `MAX_TOTAL_ASSET_BYTES = 8MB` < 10.57MB واقعی → رد قطعی.
2. بنِ هوک React در `validateThemeComponentJs` (رجکسی روی `useRef|useState|…`) **false-positive** بود: theme.js این قالب کامپوننت React واقعی است — hooks داخل `function Home(p){…}` و خروجی `h(Home, p)` با `apiVersion: 2` — که SDK (`mountComponent` → `React.isValidElement` → `root.render`) کامل پشتیبانی می‌کند. رجکس الگوی سالم را نمی‌شناخت.

---

## ۲) تغییرات (فایل/خط)

| فایل | تغییر |
|---|---|
| **`server/themeInstallJobs.ts`** (جدید، ~۳۰۰ خط) | Job manager: `createThemeInstallJob` / `getThemeInstallJob` / `quickValidateThemeZip` (preflight بدون decompress کل ZIP) / `recoverThemeInstallJobs` (boot) / `sweepStaleThemeInstallJobs` (TTL ۶ ساعت) / staging `themes/.staging/<jobId>/` (source.zip + job.json) / سقف هم‌زمانی نصب = ۲ |
| **`server.ts`** | `POST /api/admin/themes/install` → مسیر async پیش‌فرض: preflight سریع → **202 + jobId + pollUrl**؛ `?async=0` همان مسیر sync قبلی (سازگاری). `GET /api/admin/themes/install-jobs/:jobId` (وضعیت + progress). `recoverThemeInstallJobs()` در boot بعد از `cleanupStaleThemeDirs()` |
| **`server/themeStore.ts`** | ① `validateThemeComponentJs` بازنویسی AST-based با **acorn** (وابستگی جدید): hook فقط داخل تابعی که «به‌عنوان کامپوننت» ارجاع شده (`h(Comp,…)`/`createElement(Comp,…)` — ارجاع، نه فراخوانی) مجاز است؛ الگوی حادثهٔ ۲۰۲۶-۰۹-۱۱ (hook مستقیم در render) همچنان رد. ② نوشتن assetها: **pool موازی ۸تایی** + پیش‌ساخت یکتای پوشه‌ها + progress callback (`onProgress`/`onInstalling`). ③ `cleanupStaleThemeDirs` دیگر `.staging` را نمی‌کشد (مال job manager است) |
| **`server/themePerformance.ts`** | سقف مجموع 8MB → **24MB**، تک‌فایل 3MB → **8MB** (با حفظ دفاع‌های bomb در preflight؛ محافظت اصلی همان تبدیل خودکار WebP است) |
| **`server/apiMessages.ts`** | کلیدهای چهارزبانهٔ `THEME_ZIP_TOO_LARGE` و `THEME_EXISTS_ID` (قاعدهٔ «هیچ رشتهٔ فارسی خام در server.ts») |
| **`src/components/AdminPanelTab.tsx`** | `handleInstallZip`: هندل هر دو پاسخ — **202 → پولینگ ۱.۲s (timeout ۱۰min، تحمل ۶ خطای شبکه‌ای)** و 200 (sync قدیمی)؛ progress واقعی (فاز + شمارندهٔ فایل + progress bar)؛ در failed خطای **واقعی job** نمایش داده می‌شود (نه 524 هاردکد)؛ دکمهٔ نصب تا پایان job غیرفعال؛ retry امن (فایل انتخابی حفظ می‌شود) |
| **`tests/theme-install.test.mts`** (جدید) | ۱۶ تست E2E با ZIP واقعی (زیر) + لایهٔ جدید در `run-all` |
| **`tests/api.test.mts`** | ۴ تست نصب قالب به قرارداد 202/poll مهاجرت شد (`installThemeSync` helper) |
| **`tests/unit.test.mts`** | ۴ تست جدید validator هوک (الگوهای arena3d مجاز / فراخوانی مستقیم و hook-در-render ممنوع) |
| **`package.json`** | `acorn ^8.18.0` به dependencies |

**بدون تغییر:** مسیر Management App (`/api/sync/themes/install`) عمداً sync ماند (قرارداد اپ دسکتاپ پشت کلید API، بدون timeout کلادفلر) — ولی از همان موتور بهینه‌شده (نوشتن موازی) بهره می‌برد. SDK، سرو asset، ساختار ZIP قالب: دست‌نخورده.

---

## ۳) قرارداد API جدید

```
POST /api/admin/themes/install?name=&replace=1&activate=1[&async=0]
  → 202 { success, status:"processing", jobId, themeId, version, progress, pollUrl }
  → 200 (فقط ?async=0) همان پاسخ sync قدیمی
  → 400 { error, code }  ← preflight: invalid-zip / unsafe-entry / too-many-entries /
                            zip-bomb-size / zip-bomb-ratio / no-css / no-meta / bad-meta /
                            bad-theme-id / bad-theme-version
  → 409 { error, code:"THEME_EXISTS_ID" }  (بدون replace، قبل از ساخت job)
  → 413 { error, code:"THEME_ZIP_TOO_LARGE" }  (بدنهٔ >30MB)

GET /api/admin/themes/install-jobs/:jobId   (requireAdmin)
  → 200 { success, jobId, status: queued|validating|extracting|installing|completed|failed,
          phase, progress:{filesDone,filesTotal}, theme?, replaced?, activeThemeId?,
          performance?, error?, errorCode? }
  → 404 { error:"JOB_NOT_FOUND" }
```

**امنیت (همه حفظ شد):** Zip-slip و مسیر مطلق/backslash → رد صریح `unsafe-entry` (حتی اگر theme.json سالم باشد)؛ ZIP-bomb با دو دفاع مستقل (سقف uncompressed 24MB + نسبت فشرده‌سازی ≤100×)؛ سقف 1500 entry؛ سقف بدنهٔ 30MB (413)؛ allowlist پسوند asset و theme.json validation در موتور نصب دست‌نخورده؛ auth ادمین روی هر دو endpoint؛ swap اتمیک `.old` با rollback؛ پاک‌سازی staging در failure/restart/TTL.

**بازیابی‌پذیری:** job.json روی دیسک persist می‌شود؛ ری‌استارت وسط job → در boot `failed/SERVER_RESTARTED` با پیام روشن + حذف source.zip؛ jobهای تمام‌شده ۶ ساعت برای poll دیرهنگام می‌مانند. هم‌زمانی کل نصب‌ها ≤ ۲.

---

## ۴) نتایج ۱۶ تست واقعی (`tests/reports/theme-install.json` — ZIP واقعی، سرور واقعی، همه سبز)

| # | سناریو | نتیجه |
|---|---|---|
| 1 | ZIP واقعی 10.6MB/405entry | **202 فوری** + jobId/pollUrl (قبلاً: 524) |
| 2 | تکمیل job + سلامت فایل‌ها | completed؛ **۳۹۴ فریم + manifest بایت‌به‌بایت identical**؛ فقط ۷ jpg پورتال-منو طبق بهینه‌سازی استاندارد موتور (pre-existing، همهٔ قالب‌ها) به WebP تبدیل شدند؛ theme.json نرمال‌شده با حفظ id/name/version/strings |
| 3 | سرو عمومی | theme.css (text/css) + **theme.js سرو می‌شود** (بنِ هوک رفع شد) + frame-0001.webp با `image/webp` و بایت‌های identical |
| 4 | نصب مجدد بدون replace | 409 `THEME_EXISTS_ID` قبل از ساخت job |
| 5 | replace=1 | 202 → completed با `replaced:true` |
| 6 | jobId نامعتبر | 404 `JOB_NOT_FOUND` |
| 7 | ZIP خراب | 400 `invalid-zip`، سرور زنده ماند |
| 8 | zip-slip (`../../evil.txt`) | 400 `unsafe-entry`؛ هیچ فایلی بیرون themes نوشته نشد |
| 9 | ZIP-bomb (نسبت ~1000×) | 400 `zip-bomb-ratio` |
| 10 | بدون theme.json | 400 `no-meta` |
| 11 | پایداری قالب فعال حین نصب | در **هر** poll حین extracting، theme.css قالب فعال 200 و unchanged؛ `activate=0` قالب فعال را عوض نکرد (swap اتمیک) |
| 12 | سازگاری `?async=0` | 200 با شکل پاسخ sync قدیمی |
| 13 | Management App sync route | 200 sync (قرارداد حفظ شد) |
| 14 | **ری‌استارت وسط job** (kill -9) | بعد از boot: `failed/SERVER_RESTARTED` + source.zip پاک + job.json برای poll باقی + قالب نصب‌شدهٔ قبلی سالم |
| 15 | لاگ lifecycle | `queued — theme "bazino-arena3d" v1.0.0 (405 entries)` / `completed — theme "bazino-arena3d"` / `recovered job … as failed` |
| 16 | اعتبارسنجی admin | 401 بدون توکن (هر دو endpoint از middleware سراسری /api/admin) |

**زمان مراحل روی سندباکس (همان سخت‌افزار تست):** 202 فوری (~۲۲۰ms شامل preflight و نوشتن staging) → کل نصب در background ~0.8–2s. برای Railway کند فقط کل مکالمه HTTP از ~۱۰۰s+ به ~۰.2s کاهش یافت؛ زمان واقعی نصب به سقف ۱۰ دقیقه‌ای پولینگ فرانت پوشش داده می‌شود.

---

## ۵) چک‌لیست الزامات پرامت

- [x] ZIP→temp امن → اعتبارسنجی سریع → Job → 202 → پردازش background → endpoint وضعیت
- [x] خواندن یک‌بار ZIP (preflight فقط متادیتا را decompress می‌کند؛ موتور یک‌بار می‌خواند)، بدون کپی اضافه، نوشتن موازی محدود (۸)، بدون Promise.all بی‌سقف، hash فقط هنگام streaming (بدون تغییر)، ساخت پوشه‌ها یک‌بار
- [x] Replace اتمیک؛ active سالم می‌ماند (تست ۱۱)؛ cleanup staging در failure/restart/TTL
- [x] همهٔ کنترل‌های امنیتی حفظ + سقفها تنظیم (24MB/1500 entry/ratio 100×)
- [x] UI: progress، پولینگ کنترل‌شده، خطای واقعی job، دکمهٔ غیرفعال حین processing، refresh در completed، retry امن
- [x] سازگاری قبلی: قالب‌های کوچک sync با `?async=0`؛ فرانت هر دو شکل را هندل می‌کند؛ SDK/سرو asset بدون تغییر ناسازگار
- [x] ۱۲+ سناریو با ZIP واقعی + شواهد
- [x] run-all سبز: **۶۶۲/۶۶۲**
- [x] فریم‌ها بدون هیچ تغییری (تست ۲ بایت‌به‌بایت) — ZIP قالب دستکاری/recompress نشد؛ timeout کلادفلر پنهان نشد؛ ریپوی قالب تغییر نکرد
