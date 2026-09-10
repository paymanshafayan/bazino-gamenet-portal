# 🌉 پل مرورگر کارفرما — راهکار نهایی اتصال ایجنت به Chrome (CDP over HTTP)

> **تاریخ ثبت:** 2026-09-10 · **وضعیت:** ✅ عملیاتی و اثبات‌شده در جلسه زنده
> **مسیر اجرای سندباکس:** `/home/user/cdp/` (بیرون ریپو — هرگز کامیت نشود)
> این سند نسخهٔ مرجع کامل است؛ خلاصهٔ وضعیتی در `HANDOFF_PROMPT.md` §۲۸–§۲۹ آمده است.

---

## ۱. هدف

ایجنت (در سندباکس Arena) باید بتواند مرورگر Chrome لوکال **کارفرما** را از راه دور هدایت کند:
فهرست تب‌ها، ناوبری، اسکرین‌شات، اجرای جاوااسکریپت — برای تست‌های زندهٔ سایت پروداکشن
(bazino.pro) بدون دسترسی مستقیم ایجنت به اینترنت آزاد.

## ۲. راهکار نهایی (معماری v6 — «رلهٔ HTTP معکوس»)

```
┌────────────────────── کامپیوتر کارفرما (Windows/PowerShell) ──────────────────────┐
│  Chrome ایجنت (پروفایل جدا: chrome-agent)                                          │
│    --remote-debugging-port=9222 --remote-allow-origins=*                           │
│         ▲ ws://127.0.0.1:9222 (WebSocket لوکال — سریع و بدون محدودیت)             │
│         │                                                                         │
│  پل PowerShell (اسکریپت §۵ — بدون هیچ نصب، فقط .NET داخلی)                        │
│         │ HTTP polling (همان دامنهٔ پیش‌نمایش پلتفرم — مجوز لازم نیست)             │
└─────────┼─────────────────────────────────────────────────────────────────────────┘
          ▼  https://sbx-<id>.arena.site   (تنها یک URL عمومی به ازای هر سندباکس)
┌────────────────────── سندباکس ایجنت (E2B) ────────────────────────────────────────┐
│  relay.py  :8787 (HTTP عمومی)                                                     │
│    POST /up?code=…      ← فریم‌های NDJSON کروم→رله                                 │
│    GET  /down?code=…&after=N  ← فریم‌های رله→کروم (poll کوتاه)                     │
│    GET  /status · GET  /report · GET  /  (صفحهٔ دیاگ bridge.html)                  │
│         ▲ ws://127.0.0.1:8789 (لوکال سندباکس — قابل‌اعتماد)                        │
│  watcher.py → agent.py (کلاینت CDP ایجنت؛ attach خودکار به محض وصل شدن پل)        │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**اصل طلابی طراحی:** هر ارتباطی که از پروکسی پلتفرم رد می‌شود باید **HTTP ساده** باشد؛
WebSocket فقط در حلقه‌های لوکال (کامپیوتر کارفرما↔کروم، و داخل سندباکس↔رله).

## ۳. چرا این معماری؟ (هر molehill با شاهد بسته شد)

| # | مانع کشف‌شده | شاهد | نتیجه |
|---|---|---|---|
| ۱ | خروجی HTTPS سندباکس whitelist است؛ فقط `github.com` و `registry.npmjs.org` بازند (cloudflare/ngrok/google/bazino.pro همه exit=35) | curl ماتریسی 2026-09-10 | پلن «تانل cloudflared + کلاینت سمت ایجنت» مرده؛ کاربر نباید تلاش تانل کند |
| ۲ | خطای کاربر روی cloudflared: `Failed to initialize DNS local resolver … argotunnel.com: i/o timeout` | خروجی کاربر 2026-09-10 | DNS ویندوز او هم موقتاً مشکل داشت؛ مسیر cloudflared کلاً کنار گذاشته شد |
| ۳ | دامنهٔ `https://<port>-<id>.e2b.app` هدر `e2b-traffic-access-token` می‌خواهد که فقط مرورگر خود کارفرما (جلسهٔ Arena) دارد | fetch_page → صفحهٔ «Missing Traffic Access Token» | PowerShell نمی‌تواند مستقیم به e2b.app وصل شود |
| ۴ | دامنهٔ پیش‌نمایش `https://sbx-<id>.arena.site` از دستگاه کارفرما (با VPN) **بدون توکن** کار می‌کند و دقیقاً به پورت ثبت‌شدهٔ اول سندباکس می‌رسد | گزارش‌های زندهٔ صفحهٔ bridge.html که در همان ثانیه به `relay-events.log` رسیدند | این دامنه = تنها مسیر عمومی مجاز |
| ۵ | پروکسی پلتفرم فقط **یک** URL عمومی می‌سازد؛ `8788-….arena.site` وجود ندارد («There isn't a site hosted at this URL») | خطای Invoke-RestMethod کاربر | همهٔ سرویس‌ها باید روی همان یک پورت باشند |
| ۶ | از مسیر پروکسی، handshake وب‌سوکت رد می‌شود ولی **فریم‌های دیتای WS یا ~۳۰ ثانیه معطل می‌شوند یا گم می‌شوند** | relay-events.log: پاسخ کروم 08:27:04 تولید، 08:27:34 رسیده؛ ۲ فریم بعدی هرگز نرسیدند | WS از مسیر پروکسی برای CDP مرده است |
| ۷ | HTTP از همان مسیر **همان لحظه**** می‌رسد (حتی POST بدنهٔ ۲۵KB) | کل گزارش‌ها + جلسهٔ موفق نهایی با RTT فریم ۱–۳ ثانیه | HTTP polling = ترنسپورت پل |
| ۸ | صفحهٔ وب امن (https) نمی‌تواند به `ws://127.0.0.1` کروم وصل شود (mixed-content + Private Network Access در مرورگرِ خود کاربر؛ فلگ کروم ایجنت بی‌اثر چون بلاک در مبدأ است) | diag_net_blocked: Failed to fetch در لاگ | پلِ داخل‌مرورگری (bridge.html) کنار گذاشته شد؛ PowerShell = مبدأ غیرمحدود |
| ۹ | چک Host کروم (ضد DNS-rebinding) فقط روی HTTP اعمال می‌شود، نه WebSocket | گروه کروم دیباگینگ (کارتاچی) | PowerShell می‌تواند مستقیم ws لوکال کروم را باز کند |

## ۴. اجزا و فایل‌ها (سمت سندباکس، خارج از ریپو)

| فایل | نقش |
|---|---|
| `/home/user/cdp/relay.py` | رلهٔ v6: HTTP عمومی :8787 + WS لوکال :8789 + صف فریم + لاگ رویداد ماندگار |
| `/home/user/cdp/agent.py` | کلاینت CDP ایجنت: getTargets → attach → screenshot → evaluate |
| `/home/user/cdp/watcher.py` | نگهبان: به محض `HTTP_BRIDGE_UP` یا `CONNECT role=bridge` در لاگ، ایجنت را خودکار وصل می‌کند |
| `/home/user/cdp/bridge.html` | صفحهٔ دیاگ روی `/` (گزارش رویدادها به `/report`؛ برای عیب‌یابی از مرورگر خود کارفرما) |
| `/home/user/cdp/mock_cdp.py` · `mock_http_bridge.py` · `mock_bridge.py` | شبیه‌سازها برای **تمرین کامل زنجیره داخل سندباکس قبل از هر جلسهٔ زنده** |
| `/home/user/cdp/relay-events.log` | شاهد عینی: تک‌تک CONNECT/DISCONNECT/FRAMEها با timestamp |

## ۵. راه‌اندازی گام‌به‌گام

### گام ۰ — سمت ایجنت (سندباکس)

```bash
python3 -m venv /home/user/cdp/venv && /home/user/cdp/venv/bin/pip install -q websockets
cd /home/user/cdp
# کد جفت‌سازی تازه برای هر جلسه بساز (هرگز در چتِ عمومی/ریپو ذخیره نکن):
CODE=$(python3 -c "import secrets; print(secrets.token_hex(8))")
./venv/bin/python relay.py "$CODE" 8787 8789 &     # HTTP عمومی + WS لوکال
./venv/bin/python -u watcher.py &                  # attach خودکار ایجنت
# URL عمومی = دامنهٔ پیش‌نمایش پلتفرم (sbx-<id>.arena.site) که پورت 8787 را سرو می‌کند
```

⚠️ پورت ۸۷۸۷ باید **اولین پورت ثبت‌شدهٔ سندباکس** باشد تا دامنهٔ `sbx-….arena.site` به آن برسد.

### گام ۱ — سمت کارفرما: باز کردن کروم ایجنت

کروم با پروفایل جدا (اکانت فرعی گوگل لاگین) — پنجرهٔ قبلی کامل بسته شود:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\chrome-agent" --no-first-run --remote-allow-origins=*
```

### گام ۲ — سمت کارفرما: اجرای پل (PowerShell — بدون هیچ نصب)

در پنجرهٔ PowerShell جدید کل اسکریپت را Paste کنید. `‎$Code` و `‎$Base` را با مقادیر جلسه
(که ایجنت در چت می‌دهد) پر کنید، سپس Enter:

```powershell
# ═══ Bazino CDP Bridge (HTTP transport) ═══
$Code = '<PAIRING-CODE>'          # از ایجنت
$Base = 'https://sbx-<id>.arena.site'   # از ایجنت
$ChromeDebug = 'http://127.0.0.1:9222'
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$st = Invoke-RestMethod "$Base/status?code=$Code" -TimeoutSec 20   # پله ۱: رله
$v = Invoke-RestMethod "$ChromeDebug/json/version"                 # پله ۲: کروم
$chromeWs = $v.webSocketDebuggerUrl
$ct = [Threading.CancellationToken]::None
$inner = [System.Net.WebSockets.ClientWebSocket]::new()            # پله ۳: WS لوکال
$inner.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(20)
[void]$inner.ConnectAsync($chromeWs, $ct).GetAwaiter().GetResult()
Write-Host 'BRIDGE UP' -ForegroundColor Green                       # پله ۴: حلقه

$MT = [System.Net.WebSockets.WebSocketMessageType]
$UTF8 = [Text.Encoding]::UTF8
$bufIn = [byte[]]::new(16*1024*1024)
$last = 0; $gen = $null; $n = 0; $errStreak = 0
$tIn = $inner.ReceiveAsync($bufIn, $ct)
try {
  while ($true) {
    $out = @()
    while ($tIn.Wait(0)) {                                          # کروم → رله
      $res = $tIn.Result
      if ($res.MessageType -eq $MT::Close) { throw 'chrome WS closed' }
      $ms = New-Object System.IO.MemoryStream
      $ms.Write($bufIn, 0, $res.Count)
      while (-not $res.EndOfMessage) { $res = $inner.ReceiveAsync($bufIn, $ct).GetAwaiter().GetResult(); $ms.Write($bufIn, 0, $res.Count) }
      $txt = $UTF8.GetString($ms.ToArray())
      Write-Host ("[{0,3}] chrome->relay {1,7}B  {2}" -f ++$n, $ms.Length, $txt.Substring(0, [Math]::Min(80, $txt.Length)))
      $out += $txt
      $tIn = $inner.ReceiveAsync($bufIn, $ct)
    }
    if ($out.Count -gt 0) {
      Invoke-RestMethod -Method Post -Uri "$Base/up?code=$Code" -Body ($out -join "`n") -ContentType 'application/json; charset=utf-8' -TimeoutSec 30 | Out-Null
    }
    try {                                                           # رله → کروم
      $r = Invoke-RestMethod "$Base/down?code=$Code&after=$last" -TimeoutSec 20
      $errStreak = 0
    } catch {
      $errStreak++
      if ($errStreak -ge 10) { throw }
      Start-Sleep -Milliseconds 500; continue
    }
    if ($gen -ne $r.gen) { $gen = $r.gen; $last = 0 }
    foreach ($f in $r.frames) {
      $last = $f.seq
      $bytes = $UTF8.GetBytes($f.d)
      Write-Host ("[{0,3}] relay->chrome {1,7}B  {2}" -f ++$n, $bytes.Length, $f.d.Substring(0, [Math]::Min(80, $f.d.Length)))
      [void]$inner.SendAsync($bytes, $MT::Text, $true, $ct)
    }
    if (-not ($tIn.Wait(120))) { Start-Sleep -Milliseconds 50 }
  }
} finally {
  foreach ($w in @($inner)) { try { $w.Dispose() } catch {} }
  Write-Host 'Bridge disconnected.' -ForegroundColor Yellow
}
```

### گام ۳ — اتصال ایجنت (خودکار)

`watcher.py` به محض دیدن `HTTP_BRIDGE_UP` در لاگ، `agent.py` را وصل می‌کند.
نشانهٔ موفقیت در پنجرهٔ PowerShell کارفرما: فریم‌های `_relay_welcome_bridge` →
`Target.getTargets` → پاسخ‌ها، و خروجی ایجنت: لیست تب‌ها + ذخیرهٔ `proof.jpg`.

### گام ۴ — بستن جلسه

کارفرما پنجرهٔ PowerShell را می‌بندد (kill-switch فوری) → ایجنت رله را stop می‌کند.

## ۶. پروتکل HTTP پل (مرجع پیاده‌سازی)

| Endpoint | متد | نقش |
|---|---|---|
| `/up?code=…` | POST | بدنه = فریم‌های NDJSON کروم (هر خط یک پیام CDP)؛ تحویل به ایجنت |
| `/down?code=…&after=N` | GET | `{"gen":G,"frames":[{"seq":n,"d":"…"}]}` — فریم‌های با seq بزرگ‌تر از N؛ پل `after` را روی آخرین seq می‌برد |
| `/status?code=…` | GET | وضعیت زنده: `http_bridge_alive` · `agent_alive` · `queue_len` |
| `/report?ev=&d=` | GET | گزارش رویدادهای صفحهٔ دیاگ (بدون code) |
| `/` | GET | صفحهٔ دیاگ bridge.html |

نکات: `gen` با هر ری‌استارت رله عوض می‌شود و پل `after` را صفر می‌کند؛ فاصلهٔ poll > ۱۰
ثانیه = نشانهٔ جلسهٔ جدید (خوش‌آمد دوباره صف می‌شود)؛ فریم‌های خوش‌آمد `id:-1` هستند و
ایجنت نادیده‌شان می‌گیرد (کروم به آن‌ها خطای `-32601` می‌دهد که طبیعی و سالم است).

## ۷. امنیت

- **کد جفت‌سازی** تنها کلید احراز `/up` و `/down` است؛ برای هر جلسهٔ زنده تازه ساخته شود و **هرگز در ریپو (public) یا چت ثبت نشود**. (صفحهٔ `/` کد را embed می‌کند — URL سندباکس قابل حدس نیست ولی رله را بعد از کار خاموش کنید.)
- **kill-switch:** بستن پنجرهٔ PowerShell کارفرما = قطع فوری دسترسی.
- فقط پروفایل `chrome-agent` (اکانت فرعی) در معرض است؛ کروم اصلی کارفرما دست‌نخورده.
- اسکرین‌شات‌ها/لاگ‌های CDP هرگز در ریپو commit نشوند (محتوای پنل ادمین).
- توصیه: VPN کارفرما فقط حین پل روشن باشد.

## ۸. درس‌آموخته‌های عملی (برای جلسات بعد)

1. **هرگز پل زنده را بدون تمرین داخلی (mock_cdp + mock_http_bridge) تحویل کارفرما نکن** — تمرین ۴ بار جانِ این پروژه را داد.
2. **لاگ ماندگار بنویس** (`relay-events.log`) — دو بار پروسهٔ رله بین نوبت‌ها مرد و اگر لاگ فایلی نبود، شواهد گم می‌شد.
3. سندباکس بین نوبت‌ها گاهی فایل‌سیستم را به اسنپ‌شات برمی‌گرداند — قبل از هر نوبت صحت فایل‌ها را چک کن.
4. فریم‌های خوش‌آمد خودکار (`_relay_welcome_*`) تستِ «حلقهٔ دیتا در هر دو جهت» را بدون ایجنت ممکن می‌کنند — اولین چیزی که باید در پنجرهٔ PowerShell دیده شود.
5. اگر `Unable to connect` روی `sbx-….arena.site` آمد → اول VPN کارفرما را چک کن (این دامنه از ایران بدون VPN احتمالاً بسته است).

## ۹. نتیجهٔ جلسهٔ زندهٔ اثبات (2026-09-10 ~09:04 UTC)

- پل HTTP کارفرما ↔ رله ↔ ایجنت: **برقرار**
- لیست targetهای واقعی کروم کارفرما (۵ عدد، شامل `chrome://newtab/`): ✓
- اسکرین‌شات واقعی صفحه (`proof.jpg`، JPEG سالم): ✓
- خواندن عنوان/URL صفحه از مرورگر کارفرما (`New Tab | chrome://new-tab-page/`): ✓
- RTT فریم‌ها ۱–۳ ثانیه؛ انتقال فریم ۲۵KB (اسکرین‌شات base64) بدون مشکل: ✓
