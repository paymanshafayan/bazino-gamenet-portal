# 🌐 پل CDP بازینو — نسخهٔ 3 (ریکاور خودکار، بدون تابع)
# نسخهٔ کامیت‌شده با placeholder است؛ ایجنت در چت نسخهٔ پرشده با Base/Code واقعی جلسه می‌دهد.
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Base   = '<BASE-URL>'              # از ایجنت — مثال: https://sbx-xxxxxxxx.arena.site
$Code   = '<PAIRING-CODE>'          # از ایجنت
$Chrome = 'http://127.0.0.1:9222'

$after = 0; $ws = $null; $rxTask = $null; $rxBuf = $null; $frag = $null
$upBuf = New-Object System.Collections.Generic.List[string]

Write-Host ('[پل] شروع — رله: ' + $Base) -ForegroundColor Cyan

while ($true) {
  try {
    # --- اتصال به کروم (اتوماتیک، اگر باز/سالم نباشد دوباره تلاش می‌کند) ---
    if ($null -eq $ws -or $ws.State -ne [System.Net.WebSockets.WebSocketState]::Open) {
      if ($null -ne $rxTask) { try { $rxTask.Dispose() } catch {}; $rxTask = $null }
      if ($null -ne $ws)     { try { $ws.Dispose() } catch {} }
      $ver = Invoke-RestMethod -Uri "$Chrome/json/version" -TimeoutSec 5
      if (-not $ver.webSocketDebuggerUrl) { throw 'پورت دیباگ 9222 پاسخ نداد — کروم ایجنت باز است؟' }
      $ws = New-Object System.Net.WebSockets.ClientWebSocket
      $ws.ConnectAsync([Uri]$ver.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()
      $frag = New-Object System.IO.MemoryStream
      Write-Host ('[پل] ' + (Get-Date -Format HH:mm:ss) + ' وصل شد به کروم') -ForegroundColor Green
    }

    # --- فرمان‌های ایجنت از رله بگیر و به کروم بفرست ---
    $r = Invoke-RestMethod -Uri "$Base/down?code=$Code&after=$after" -TimeoutSec 15
    $frames = @($r.frames) | Where-Object { $_ }
    foreach ($f in $frames) {
      if ([int]$f.seq -gt $after) { $after = [int]$f.seq }
      $bytes = [Text.Encoding]::UTF8.GetBytes([string]$f.d)
      $ws.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
    }

    # --- دریافت از کروم (تسک در انتظار، بدون تایم‌اوت) ---
    if ($null -eq $rxTask -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
      $rxBuf = New-Object byte[] (1048576)
      $rxTask = $ws.ReceiveAsync([ArraySegment[byte]]::new($rxBuf), [Threading.CancellationToken]::None)
    }

    if ($null -ne $rxTask -and $rxTask.IsCompleted) {
      $res = $rxTask.Result
      $rxTask = $null
      if ($res.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { throw 'کروم سوکت را بست' }
      $frag.Write($rxBuf, 0, $res.Count)
      if ($res.EndOfMessage -and $frag.Length -gt 0) {
        $upBuf.Add([Text.Encoding]::UTF8.GetString($frag.ToArray()))
        $frag.SetLength(0)
      }
    }

    # --- پیام‌های کروم را به رله بفرست ---
    if ($upBuf.Count -gt 0) {
      $body = ($upBuf -join "`n")
      $upBuf.Clear()
      Invoke-RestMethod -Uri "$Base/up?code=$Code" -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($body)) -ContentType 'text/plain; charset=utf-8' -TimeoutSec 30 | Out-Null
    }
  } catch {
    Write-Host ('[پل] ' + (Get-Date -Format HH:mm:ss) + ' خطا/قطعی: ' + $_.Exception.Message) -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    try { if ($null -ne $rxTask) { $rxTask.Dispose() } } catch {}
    try { if ($null -ne $ws) { $ws.Dispose() } } catch {}
    $rxTask = $null; $ws = $null
  }
  Start-Sleep -Milliseconds 120
}
