# 👁️ راهکار بینایی ایجنت — تحقیق و اثبات (۲۰۲۶-۰۹-۱۱)

> **مسیر:** `cdp-tools/VISION.md` — کامیت‌شده در برنچ arena (بدون هیچ سکرت).
> **زمینه:** مدلِ خدمت‌دهندهٔ ایجنت در این جلسه قابلیت دیدن تصویر (vision) ندارد —
> `read_file` روی تصویر پیام «you do not have vision capabilities» می‌دهد.
> این سند نتیجهٔ تحقیق گسترده برای برگرداندن بینایی است. **نتیجه: بینایی برگشت — با ۳ لایهٔ اثبات‌شده.**

---

## ۰. محدودیت‌های محیط (کشف‌شده با تست)

| مورد | وضعیت | شاهد |
|---|---|---|
| خروجی شبکهٔ سندباکس | فقط `registry.npmjs.org` + `pypi.org` + `files.pythonhosted.org` + `github.com`/`api.github.com`/`codeload` بازند | curl ماتریسی ۱۷:۰x |
| HuggingFace / jsdelivr / api.groq.com / openrouter.ai | ❌ مسدود → هر راهکار «مدل آنلاین از سندباکس» مرده | exit 000 |
| apt (deb.debian.org) | ❌ مسدود → نصب بستهٔ سیستمی ممکن نیست | exit 000 |
| pip | ✅ کامل (پکیج + مدل‌های داخل wheel) | rapidocr نصب شد |
| RAM/DISK | 2 CPU / 3.8GB RAM / 20GB آزاد | free, df |
| **ریبیلد سندباکس** | **فقط فایل‌های track‌شدهٔ گیت در درخت ریپو زنده می‌مانند.** فایل‌های excluded/untracked (حتی داخل درخت ریپو)، node_modules و پکیج‌های سیستمی pip پاک می‌شوند؛ HEAD به نقطهٔ انشعاب برنچ (df7cc27) برمی‌گردد | ریبیلدهای #۳ (۱۶:۵۱) و #۴ (~۱۷:۱۰) |

**نتیجهٔ ریبیلد #۴:** راهکار «cdp-tools داخل درخت ریپو + exclude» غلط بود (exclude = پاک شدن).
راهکار نهایی: **کامیت ابزارها در برنچ arena بدون سکرت** + بازیابی HEAD با
`git fetch origin arena/… && git reset --hard FETCH_HEAD` بعد از هر ریبیلد.

## ۱. لایهٔ A — زنجیرهٔ اوراکل بینایی (بینایی معنایی واقعی) ⭐

**ایده:** ابزار `generate_image` سمت پلتفرم است (نه سندباکس) و مدل تصویر آن
**واقعاً تصویر ورودی را می‌بیند**. از آن به‌عنوان «چشم» استفاده می‌کنیم و خروجی را
به‌صورت «سند متنی سفید با متن مشکی» می‌گیریم، سپس با OCR محلی می‌خوانیم:

```
تصویر → generate_image(images:[img], prompt="سند متنی از توضیح بصری")
      → تصویر سند متنی → python3 ocr.py → من متن توضیح را می‌خوانم
```

**اثبات (متقاطع با OCR مستقیم):** روی اسکرین‌شات تست، اوراکل گفت:
«MOOD: DARK, CYBERPUNK, ENERGETIC WITH NEON LIGHTING»،
«TYPOGRAPHY: BOLD, MODERN FONTS (BISON, AMERICAN CAPTAIN)»،
«PRODUCT LISTING: NEON MASKS (LIGHT BLUE, PINK, BLUE)»،
«UI DETAILS: ROUNDED RECTANGLE BUTTONS, GLOW EFFECTS».
OCR مستقیم همان تصویر: NEON / NIGHTLIFE / BISON BOLD / AMERICANCAPTAINCYRILIC ✓
+ `palette.py` همان تصویر: dark (روشنایی ۴۴)، #1a2544 + #100516 + **#ec417b نئونی** ✓
→ سه روش مستقل هم‌داستان‌اند؛ توضیح اوراکل واقعی است نه توهم.

**نکات کاربردی:**
- برای جزئیات یک ناحیه: اول با PIL کراپ کن، بعد همان کراپ را به اوراکل بده.
- متن طولانی داخل تصویر را اوراکل دقیق رونویسی نمی‌کند — برای متن، لایهٔ B.
- هر تصویر = یک فراخوانی generate_image + یک OCR (~۸ ثانیه).

## ۲. لایهٔ B — OCR محلی (متن + مختصات، آفلاین، بدون کلید)

```bash
pip3 install --break-system-packages rapidocr-onnxruntime opencv-python-headless pillow
# ⚠️ بعد از هر ریبیلد سندباکس باید دوباره نصب شود (سیستم‌دایر پاک می‌شود)
python3 cdp-tools/ocr.py <image>        # JSON: خطوط + x/y/w/h + confidence
```
- مدل‌ها داخل wheel پکیج‌اند → هیچ دانلود خارجی لازم نیست.
- مختصات یعنی **بازسازی چیدمان** (کدام متن کجای صفحه است).
- فونت‌های نمایشی/استایلایز خوانده می‌شوند (BISON BOLD با confidence 1.0).

## ۳. لایهٔ C — شبه‌بینایی رنگ/چیدمان (کاملاً محلی)

```bash
python3 cdp-tools/palette.py <image> [--k 6] [--grid 8 6]
```
پالت غالب (hex + سهم)، روشنایی کلی + حکم dark/light، و ماتریس رنگ سلول‌ها برای
فهم چیدمان عمودی صفحه. برای وریفای «قالب درست رندر شده؟» (تیره؟ نئون سرخابی؟
هرو بالا؟) کافی و سریع است.

## ۴. لایهٔ D — تحلیل DOM/صحنه از مرورگر کارفرما (غنی‌تر از پیکسل)

`analyze-current.js` از طریق پل CDP: مش‌ها/متریال/نورهای three.js،
شنونده‌های ماوس، واکنش صحنه به ماوس (مقایسهٔ اسکرین‌شات)، WebGL info، ساختار DOM.
برای صفحات وب این لایه دادهٔ بیشتری از پیکسل‌ها می‌دهد.

## ۵. گزینهٔ پلتفرمی (سمت کارفرما، بدون تحقیق فنی من)

مقالهٔ رسمی Arena: منوی انتخاب مدل در حالت Direct/Side-by-Side **فیلتر modality** دارد
(آیکون کنار نام مدل نشان می‌دهد چه حس‌هایی را پشتیبانی می‌کند). اگر مدل چندوجهی
انتخاب شود تصاویر مستقیم دیده می‌شوند — ولی برای Agent Mode مستند نیست و
جابه‌جایی مدل وسط جلسه ممکن است جلسه را تغییر دهد. (منبع: help.arena.ai — مقالهٔ
«How to Select Specific Models in Arena»)

## ۶. آنچه مرده است (نگشت سراغش)

- دانلود مدل VLM از HuggingFace (شبکه مسدود) — GGUF/transformers از سندباکس قابل‌دستیابی نیست.
- هر API آنلاین تصویر (Groq/OpenRouter/Gemini) از داخل سندباکس — مسدود؛ ضمناً سکرت در چت ممنوع.
- apt/tesseract بستهٔ سیستمی — مخازن Debian مسدودند.
- اجرای VLM لوکال با وزن‌های GitHub — فایل‌های >100MB همگی LFS (raw مسدود)؛ codeload فقط LFS-pointer می‌دهد.

## ۷. جعبه‌ابزار `cdp-tools/` — کامیت‌شده در برنچ arena (مقاوم در برابر ریبیلد)

| فایل | نقش |
|---|---|
| `relay.js` | رلهٔ v7 پل CDP (پورت ۸۷۸۷؛ HTTP واحد + صف‌ها + لاگ) |
| `lib.js` | کلاینت رله/CDP ایجنت |
| `agent.js` | CLI: status / tabs / nav / eval / shot |
| `bridge.html` | صفحهٔ دیاگ پل (نمایش Base/کد + heartbeat) |
| `capture-errors.js` | هوک خطای console/window (فقط یک تزریق در هر جلسه!) |
| `upload-zip.js` | آپلود تکه‌ای ۱۲۰KB + نصب ZIP روی bazino.pro (توکن از localStorage صفحه، بدون عبور از چت) |
| `analyze-current.js` | تحلیل تب جاری (DOM + صحنهٔ three + واکنش ماوس) |
| `mock_bridge.js` | شبیه‌ساز پل برای drill داخلی قبل از جلسهٔ زنده |
| `bridge-ps-v3.ps1` | اسکریپت پاورشل کارفرما (نسخهٔ کامیت‌شده با placeholder؛ نسخهٔ پرشده فقط در چت) |
| `ocr.py` / `palette.py` | لایهٔ B و C بینایی |
| `package.json` | `{"type":"commonjs"}` — چون ریپو ESM است |
| `.gitignore` | `.session-code`، `relay-events.log`، `shots/`، `*.zip` هرگز کامیت نشوند |

**غیرِکامیت‌شده (بعد از هر ریبیلد بساز):** `.session-code` (کد جفت‌سازی — فقط در حافظهٔ جلسه/چت)، `relay-events.log` و `shots/` (خروجی زمان اجرا).

## ۸. بعد از هر ریبیلد سندباکس — چک‌لیست بازیابی (۵ دقیقه)

1. `cd bazino-gamenet-portal && git fetch origin arena/01a089a9-bazino-gamenet-portal && git reset --hard FETCH_HEAD` (ابزارها برمی‌گردند)
2. `cd cdp-tools && printf '<CODE>' > .session-code`
3. رله با start_process: `node relay.js` (پورت ۸۷۸۷ = اولین پورت → Base عمومی)
4. `pip3 install --break-system-packages rapidocr-onnxruntime opencv-python-headless pillow` (لایهٔ بینایی B/C)
5. `npm install --ignore-scripts` پس‌زمینه در ریشهٔ ریپو (برای بیلدهای قالب؛ better-sqlite3 با node-gyp می‌شکند → ignore-scripts)
6. Base عمومی جدید: کارفرما پنل Live Preview را باز می‌کند → `page_loaded` در `cdp-tools/relay-events.log` → فقط خط `$Base` اسکریپت پاورشل عوض می‌شود (`$Code` همان می‌ماند).
7. drill اختیاری: `node mock_bridge.js` در پروسهٔ جدا + `node agent.js tabs` → پاسخ mock یعنی زنجیره سالم.
