# Bazino CDP Bridge — FULL session script (auto-recovery loop)
# ============================================================
# AGENT RULE (standing order, recorded 2026-09-13 at the client's explicit
# repeated request): when the client asks to (re)connect the browser bridge,
# ALWAYS give this script IN FULL with $Base and $Code filled in for the
# current session. Never say "just change two lines".
#   $Base = public preview URL of the sandbox (changes after every sandbox
#           rebuild) — open the "CDP Browser Bridge Relay" live preview to
#           read it. It must be the FIRST listening port.
#   $Code = pairing code from cdp-tools/.session-code (stable across turns;
#           if the file is missing after a rebuild, the agent restores it
#           from the session notes BEFORE starting the relay).
# Chrome must be the AGENT Chrome (separate profile), never the client's
# main browser: see docs/ops/CDP_BROWSER_BRIDGE.md section 5, step 1.
# Console messages stay in English (client console drops Persian glyphs).
# ============================================================
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Base   = '<BASE-URL>'              # e.g. https://sbx-xxxxxxxx.arena.site
$Code   = '<PAIRING-CODE>'          # e.g. 0d9e8631106ed440
$Chrome = 'http://127.0.0.1:9222'

$after = 0; $ws = $null; $rxTask = $null; $rxBuf = $null; $frag = $null
$upBuf = New-Object System.Collections.Generic.List[string]

Write-Host ('[bridge] starting - relay: ' + $Base) -ForegroundColor Cyan

while ($true) {
  try {
    # --- connect to agent Chrome (auto-retry if not open/healthy) ---
    if ($null -eq $ws -or $ws.State -ne [System.Net.WebSockets.WebSocketState]::Open) {
      if ($null -ne $rxTask) { try { $rxTask.Dispose() } catch {}; $rxTask = $null }
      if ($null -ne $ws)     { try { $ws.Dispose() } catch {} }
      $ver = Invoke-RestMethod -Uri "$Chrome/json/version" -TimeoutSec 5
      if (-not $ver.webSocketDebuggerUrl) { throw 'Debug port 9222 did not answer - is the AGENT Chrome started (see docs step 1)?' }
      $ws = New-Object System.Net.WebSockets.ClientWebSocket
      $ws.ConnectAsync([Uri]$ver.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()
      $frag = New-Object System.IO.MemoryStream
      Write-Host ('[bridge] ' + (Get-Date -Format HH:mm:ss) + ' connected to Chrome') -ForegroundColor Green
    }

    # --- get agent commands from relay, forward to Chrome ---
    $r = Invoke-RestMethod -Uri "$Base/down?code=$Code&after=$after" -TimeoutSec 15
    $frames = @($r.frames) | Where-Object { $_ }
    foreach ($f in $frames) {
      if ([int]$f.seq -gt $after) { $after = [int]$f.seq }
      $bytes = [Text.Encoding]::UTF8.GetBytes([string]$f.d)
      $ws.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
    }

    # --- receive from Chrome (pending task, no timeout) ---
    if ($null -eq $rxTask -and $ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
      $rxBuf = New-Object byte[] (1048576)
      $rxTask = $ws.ReceiveAsync([ArraySegment[byte]]::new($rxBuf), [Threading.CancellationToken]::None)
    }

    if ($null -ne $rxTask -and $rxTask.IsCompleted) {
      $res = $rxTask.Result
      $rxTask = $null
      if ($res.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { throw 'Chrome closed the socket' }
      $frag.Write($rxBuf, 0, $res.Count)
      if ($res.EndOfMessage -and $frag.Length -gt 0) {
        $upBuf.Add([Text.Encoding]::UTF8.GetString($frag.ToArray()))
        $frag.SetLength(0)
      }
    }

    # --- send Chrome messages back to the relay ---
    if ($upBuf.Count -gt 0) {
      $body = ($upBuf -join "`n")
      $upBuf.Clear()
      Invoke-RestMethod -Uri "$Base/up?code=$Code" -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($body)) -ContentType 'text/plain; charset=utf-8' -TimeoutSec 30 | Out-Null
    }
  } catch {
    Write-Host ('[bridge] ' + (Get-Date -Format HH:mm:ss) + ' error/disconnect: ' + $_.Exception.Message) -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    try { if ($null -ne $rxTask) { $rxTask.Dispose() } } catch {}
    try { if ($null -ne $ws) { $ws.Dispose() } } catch {}
    $rxTask = $null; $ws = $null
  }
  Start-Sleep -Milliseconds 120
}
