# 🌉 راهنمای کامل اتصال ایجنت به مرورگر کارفرما — پل CDP بازینو (نسخهٔ عملیاتی v7)

> **تاریخ:** ۲۰۲۶-۰۹-۱۱ · **وضعیت:** ✅ عملیاتی و چندبار اثبات‌شده در جلسات زنده (۴ ریبیلد سندباکس را گذرانده)
> **جعبه‌ابزار:** `cdp-tools/` (کامیت‌شده در همین ریپو) · **سند معماری قدیمی:** `docs/ops/CDP_BROWSER_BRIDGE.md`
> **سند خواهر:** `cdp-tools/VISION.md` (راهکار بینایی ایجنت)
>
> این سند **روش کامل و گام‌به‌گام** اتصال ایجنت (سندباکس Arena) به Chrome لوکال کارفرماست —
> با تمام جزئیات، درس‌آموخته‌ها و عیب‌یابی. برای جانشین ایجنت نوشته شده تا بدون هیچ دانش قبلی
> بتواند پل را برقرار کند.

---

## ۱. معماری در یک نگاه

```
┌────────────────────── کامپیوتر کارفرما (ویندوز) ────────────────────────────┐
│  Chrome ایجنت (پروفایل جدا: chrome-agent)                                    │
│    --remote-debugging-port=9222                                              │
│         ▲ WebSocket لوکال ws://127.0.0.1:9222 (سریع، بدون محدودیت)          │
│  پل PowerShell (bridge-ps-v3.ps1 — فقط .NET داخلی، بدون نصب هیچ چیز)        │
│         │ HTTP polling (هر ~۱۲۰ms)                                          │
└─────────┼───────────────────────────────────────────────────────────────────┘
          ▼  https://sbx-<id>.arena.site  ← تنها URL عمومی هر سندباکس (پورت 8787)
┌────────────────────── سندباکس ایجنت ────────────────────────────────────────┐
│  cdp-tools/relay.js :8787 (رلهٔ v7 — HTTP واحد، zero-dependency)              │
│    /down → فرمان‌های ایجنت به کروم   /up → پاسخ‌های کروم به ایجنت             │
│    /agent/cmd + /agent/poll (long-poll) → API ایجنت                          │
│    /status /report / (صفحهٔ دیاگ bridge.html)                                │
│  ابزارهای ایجنت: agent.js / analyze-current.js / scroll-shots.js / …        │
└──────────────────────────────────────────────────────────────────────────────┘
```

**اصل طلایی:** هر ارتباطی که از پروکسی پلتفرم می‌گذرد باید **HTTP ساده** باشد؛
WebSocket فقط بین پاورشل و کرومِ لوکال (روی همان کامپیوتر).

**چرا این معماری؟** خروجی HTTPS سندباکس whitelist است (فقط npm/PyPI/GitHub) —
تانل‌ها (cloudflared/ngrok/e2b مستقیم) و WS از مسیر پروکسی همگی تست‌شده و مرده‌اند.
تنها استثنا: دامنهٔ پیش‌نمایش `sbx-<id>.arena.site` که بدون توکن از اینترنت باز است و
به **اولین پورتِ در حال گوش‌دادن سندباکس** می‌رسد.

---

## ۲. مؤلفه‌ها (همه در `cdp-tools/`، کامیت‌شده)

| فایل | نقش |
|---|---|
| `relay.js` | رلهٔ v7 — صف فریم، لاگ ماندگار `relay-events.log`، صفحهٔ دیاگ |
| `bridge.html` | صفحهٔ دیاگ روی `/` — **Base و کد جلسه را نشان می‌دهد** + heartbeat هر ۳۰s |
| `lib.js` | کلاینت ایجنت: کلاس `Cdp` با send/poll/attach/evalRaw/waitEvent |
| `agent.js` | CLI: `status` / `tabs` / `nav <url> [match]` / `eval "<js>" [match]` / `shot <file> [match]` |
| `analyze-current.js` | تحلیل تب جاری: DOM + صحنهٔ three.js + شنونده‌ها + واکنش به ماوس + اسکرین‌شات |
| `scroll-shots.js` | اسکرول‌شات مرحله‌ای (فعال‌سازی تب + حرکت ماوس + عکس در هر مرحله) |
| `capture-errors.js` | هوک خطای console/window قبل از لود — ⚠️ فقط **یک تزریق در هر جلسه** |
| `capture-anim2.js` / `capture-entrance.js` / `capture-scrolltest.js` | شکار انیمیشن ورود/اسکرول |
| `upload-zip.js` | آپلود تکه‌ای ZIP قالب + نصب روی bazino.pro (توکن از localStorage صفحه) |
| `mock_bridge.js` | شبیه‌ساز پل برای **drill بدون کارفرما** |
| `bridge-ps-v3.ps1` | اسکریپت پل کارفرما (کامیت‌شده با placeholder؛ نسخهٔ پرشده فقط در چت) |
| `package.json` | `{"type":"commonjs"}` — چون ریپو ESM است |
| `.gitignore` | `.session-code` / `relay-events.log` / `shots/` / `*.zip` هرگز کامیت نشوند |

**غیرکامیت‌شده (بعد از هر ریبیلد باید ساخته شود):** `.session-code` — کد جفت‌سازی جلسه.

---

## ۳. راه‌اندازی — سمت ایجنت (سندباکس)

```bash
# ۰) اگر ریبیلد اتفاق افتاده: بازیابی ابزارها (ریبیلد HEAD را به نقطهٔ انشعاب برمی‌گرداند!)
cd bazino-gamenet-portal
git fetch origin arena/01a089a9-bazino-gamenet-portal && git reset --hard FETCH_HEAD

# ۱) کد جفت‌سازی (اگر .session-code نبود؛ کد را در چت به کارفرما بده)
cd cdp-tools && printf '<16-hex-code>' > .session-code

# ۲) رله را به‌صورت پروسهٔ پس‌زمینه/بلندمدت اجرا کن (node relay.js)
#    ⚠️ حتماً باید «اولین پورت در حال گوش‌دادن» سندباکس باشد → معمولاً 8787
#    (اگر پورت دیگری زودتر باز شود، دامنهٔ عمومی به آن می‌رسد و پل کار نمی‌کند)

# ۳) کشف Base عمومی:
#    از کارفرما بخواه پنل Live Preview را باز کند → bridge.html بارگذاری می‌شود
#    و گزارش page_loaded با URL کامل به رله می‌رسد:
tail -5 relay-events.log    # → REPORT {"ev":"page_loaded","d":"https://sbx-xxxx.arena.site/"}
#    ⚠️ سندباکس خودش نمی‌تواند به sbx وصل شود (exit 35) — فقط مرورگر کارفرما می‌تواند.
#    اگر رله تازه بالا آمده و پنلِ کارفرما از قبل باز بوده، Base در گزارش‌های page_loaded
#    یا page_heartbeat قبلی هم هست (هر ۳۰ ثانیه تکرار می‌شود).

# ۴) drill داخلی (اختیاری ولی توصیه‌شده):
#    پروسهٔ جدا: node mock_bridge.js   → بعد: node agent.js tabs
#    اگر پاسخ mock آمد (target ساختگی)، زنجیرهٔ رله↔پروتکل سالم است.
```

## ۴. راه‌اندازی — سمت کارفرما

### گام ۱: باز کردن Chrome ایجنت (پروفایل جدا — کروم اصلی دست‌نخورده)

یک بار در Run (Win+R) یا cmd:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\chrome-agent" https://bazino.pro
```

- پنجره‌های قبلی این پروفایل کامل بسته شوند.
- این کروم فقط برای ایجنت است؛ اکانت فرعی/بدون لاگین کافی است.

### گام ۲: اجرای پل (PowerShell — بدون نصب هیچ چیز)

پنجرهٔ PowerShell معمولی باز کنید، اسکریپت کامل را Paste و Enter.
دو خط اول را ایجنت در چت با مقادیر واقعی جلسه پر می‌کند:

```powershell
$Base   = 'https://sbx-<id>.arena.site'   # ← از ایجنت (بعد از باز شدن پنل Live Preview)
$Code   = '<pairing-code>'                # ← از ایجنت
$Chrome = 'http://127.0.0.1:9222'
```

متن کامل اسکریپت = `cdp-tools/bridge-ps-v3.ps1` (کامیت‌شده؛ فقط دو خط بالا پر شود).
منطق اسکریپت (نسخهٔ ۳ — ریکاور خودکار، بدون تابع):

1. اتصال WS به `webSocketDebuggerUrl` کروم (از `$Chrome/json/version`)
2. حلقهٔ بی‌نهایت: `GET $Base/down?code=$Code&after=$N` → فریم‌ها را با WS به کروم بفرست
3. دریافتِ همزمان از کروم (تسک `ReceiveAsync` معلق) → هر پیام کامل را در بافر جمع کن
4. `POST $Base/up?code=$Code` با بدنهٔ NDJSON (همهٔ پیام‌های کروم)
5. خطا خورد؟ ۳ ثانیه صبر و از اول (اتصال WS دوباره ساخته می‌شود) — **پل هرگز نمی‌میرد**

نشانهٔ موفقیت: پیام سبز `وصل شد به کروم` + در پنل Live Preview (که bridge.html باز است)
نشانگر «پل کارفرما» **متصل** و شمارندهٔ فریم‌ها در حرکت.

### ⚠️ قواعد حیاتی سمت کارفرما

- **داخل پنجرهٔ PowerShell کلیک نکنید** — QuickEdit ویندوز حلقه را فریز می‌کند.
  اگر فریز شد: فقط کلید Enter بزنید (از حالت انتخاب خارج می‌شود).
- پنجره را تا پایان کار باز نگه دارید (بستن = kill-switch فوری).
- VPN کارفرما حین پل روشن باشد (دامنهٔ sbx از برخی شبکه‌ها بسته است).
- اگر `Unable to connect` آمد → اول VPN، بعد از ایجنت بخواه Base جدید را چک کند.

---

## ۵. پروتکل HTTP رله (مرجع)

| Endpoint | متد | نقش |
|---|---|---|
| `/down?code=…&after=N` | GET | فریم‌های seq>N برای کروم؛ پل `after` را روی آخرین seq می‌برد |
| `/up?code=…` | POST | بدنه = NDJSON پیام‌های CDP از کروم → صف ایجنت |
| `/agent/cmd?code=…` | POST | ایجنت فرمان CDP (JSON) را به صف کروم می‌فرستد |
| `/agent/poll?code=…&after=N&wait=ms` | GET | long-poll پاسخ‌ها/رویدادها برای ایجنت |
| `/status?code=…` | GET | `http_bridge_alive` (down<15s)، `agent_alive`، شمارنده‌ها، ۱۲ گزارش آخر |
| `/report?ev=&d=` | GET | گزارش صفحهٔ دیاگ (بدون code) — `page_loaded` / `page_heartbeat` هر ۳۰s |
| `/` | GET | صفحهٔ دیاگ bridge.html (کد جلسه embed شده) |

نکات: `gen` با ری‌استارت رله عوض می‌شود؛ فریم‌های خوش‌آمد `id:-1` هستند و کروم به آن‌ها
خطای `-32601` می‌دهد که **طبیعی و سالم** است. صف‌ها: max 400 فریم / 48MB.

---

## ۶. کارهای ایجنت روی مرورگر (پس از اتصال)

```bash
export CDP_RELAY_URL=http://127.0.0.1:8787 CDP_CODE=<code>
node agent.js status                          # سلامت پل
node agent.js tabs                            # لیست تب‌ها
node agent.js nav 'https://bazino.pro/club' ''   # ناوبری + انتظار لود
node agent.js eval "2+2" ''                   # اجرای JS در صفحهٔ اول (یا 'match' تب)
node agent.js shot shots/x.jpg 'bazino'       # اسکرین‌شات

node analyze-current.js shots/x.jpg 'match'   # تحلیل کامل تب جاری
node scroll-shots.js 'match' shots/pre 5      # اسکرول‌شات ۵ مرحله‌ای
node capture-errors.js 'https://bazino.pro/club'  # خطاهای واقعی صفحه (فقط یک بار!)
node upload-zip.js /tmp/theme.zip             # نصب ZIP قالب روی پروداکشن
```

**قواعد کار ایجنت:**
- تب هدف را قبل از هر کار با `Target.activateTarget` جلو بیاور — **تب‌های پس‌زمینهٔ کروم فریز می‌شوند** و فرمان‌ها timeout می‌خورند.
- `location.reload()` / ناوبری، سشن CDP را می‌کشد — بعدش دوباره `attach` کن (سشن تازه).
- هر فرمان CDP = یک POST به رله + poll پاسخ (RTT از مسیر کارفرما: ~۱-۳ ثانیه).
- اسکرین‌شات base64 بزرگ است؛ آپلود /up تکه‌ای نیست ولی تا ~۱MB فریم بدون مشکل رد می‌شود.

## ۷. نصب ZIP قالب روی پروداکشن (upload-zip.js)

1. ZIP را در سندباکس بساز (`theme.json` + `theme.css` + `theme.js` بدون هوک + `assets/`)
2. `node upload-zip.js <file.zip>` → تکه‌های 120KB base64 به صفحهٔ باز bazino.pro فرستاده،
   در صفحه مونتاژ و `POST /api/admin/themes/install?name=<f>.zip&replace=1&activate=1`
   با هدر `Authorization: Bearer <localStorage['bazino.authToken']>` اجرا می‌شود.
3. **توکن ادمین هرگز وارد چت/ریپو نمی‌شود** — از localStorage خود صفحه خوانده می‌شود.
4. گاردهای نصب پرتال فعال‌اند (مثلاً رد هوک‌های React در theme.js با پیام فارسی = رفتار درست).

---

## ۸. عیب‌یابی (همهٔ موارد واقعاً پیش‌آمده)

| علامت | تشخیص | درمان |
|---|---|---|
| `/status` پاسخ نمی‌دهد | رله مرده | `node relay.js` دوباره (پروسهٔ بلندمدت) |
| پنل کارفرما باز است ولی `http_bridge_alive:false` | پاورشل اجرا نیست/فریز | Paste دوبارهٔ اسکریپت؛ QuickEdit → Enter |
| پاورشل: `Unable to connect` روی sbx | Base عوض شده (ریبیلد) یا VPN | Base جدید از `relay-events.log` + VPN کارفرما |
| پاورشل: `پورت دیباگ 9222 پاسخ نداد` | کروم ایجنت بسته است | گام ۱ سمت کارفرما |
| فرمان ایجنت timeout ولی down_count بالا | **تب پس‌زمینه فریز** | `Target.activateTarget` قبل از کار (analyze-current/scroll-shots خودکار می‌کنند) |
| `Session with given id not found` (-32001) | ناوبری/ریلود سشن را کشته | دوباره `attach()` بگیر |
| اسکرین‌شات‌های متوالی یکسان | انیمیشن one-shot تمام شده / صفحه settle | شکار حین ورود: `capture-entrance.js` (با attach مجدد بعد از ریلود) یا `capture-anim2.js` |
| 502 روی sbx | فریز موقت سندباکس | صبر؛ رله معمولاً زنده است (لاگ فایل را می‌بینید) |
| `ERR_CONNECTION_CLOSED` در تب کارفرما | قطعی شبکه/VPN سمت کارفرما به آن سایت | کارفرما بعداً باز کند؛ ربطی به پل ندارد |
| curl از سندباکس به sbx → exit 35 | **طبیعی است** — خروجی سندباکس whitelist | فقط مرورگر کارفرما به sbx وصل می‌شود |
| `SyntaxError __push` بعد از تست خطا | تزریق دوبارهٔ هوک capture-errors | فقط یک بار در هر جلسه تزریق کن |

## ۹. بازیابی بعد از ریبیلد سندباکس (چک‌لیست ۵ دقیقه‌ای)

ریبیلد: HEAD → نقطهٔ انشعاب، فایل‌های excluded/untracked غیرریپو پاک، پکیج‌های سیستمی pip و node_modules پاک. ابزارهای کامیت‌شده در `cdp-tools/` **زنده می‌مانند** (بعد از reset).

```bash
cd bazino-gamenet-portal
git fetch origin arena/01a089a9-bazino-gamenet-portal && git reset --hard FETCH_HEAD
cd cdp-tools && printf '<code>' > .session-code
node relay.js                       # پروسهٔ بلندمدت — پورت 8787 اولین پورت
pip3 install --break-system-packages rapidocr-onnxruntime opencv-python-headless pillow
cd .. && npm install --ignore-scripts   # پس‌زمینه؛ better-sqlite3 با node-gyp می‌شکند
```
بعد: کارفرما پنل Live Preview را باز می‌کند → `page_loaded` در `relay-events.log` →
فقط `$Base` اسکریپت پاورشل عوض می‌شود (`$Code` همان می‌ماند). اسکریپت v3 خودش ریکاور
می‌کند؛ اگر پاورشل قبلی زنده باشد فقط خطا می‌دهد تا Base درست شود.

## ۱۰. امنیت

- کد جفت‌سازی = تنها کلید `/up` و `/down`؛ در `.session-code` (gitignored). هرگز کامیت/در چت عمومی ذخیره نشود (دادنش به کارفرما در چت خصوصی جلسه اشکال ندارد).
- kill-switch = بستن پنجرهٔ پاورشل.
- فقط پروفایل `chrome-agent` در معرض است.
- اسکرین‌شات‌ها/لاگ‌ها هرگز commit نشوند (`cdp-tools/.gitignore` پوشش می‌دهد).
- توکن ادمین bazino.pro فقط در localStorage مرورگر کارفرما می‌ماند (upload-zip.js).

## ۱۱. تاریخچهٔ نسخه‌ها

- v6 (2026-09-10): اثبات اولیه — `docs/ops/CDP_BROWSER_BRIDGE.md`
- v7 (2026-09-11): رلهٔ Node بدون وابستگی + `/agent/*` long-poll + صفحهٔ دیاگ + جعبه‌ابزار کامل،
  ساکن در `cdp-tools/` کامیت‌شده؛ درس‌های ریبیلد ۳/۴/۵ اعمال شد (کامیت‌شدن ابزارها).
- v3 پاورشل: ریکاور خودکار بدون تابع (نسخه‌های ۱-۲ اولیه با GetResult بودند).
