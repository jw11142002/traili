# Starts traili in production mode on http://localhost:3000 and exposes it publicly through a
# Cloudflare quick tunnel (no account needed). The public URL is written to data/public-url.txt.
#
#   powershell -ExecutionPolicy Bypass -File scripts\start-public.ps1
#
# Stop everything with scripts\stop-public.ps1.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$env:Path = "C:\Program Files\nodejs;" + $env:Path
$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflared)) { $cloudflared = (Get-Command cloudflared -ErrorAction Stop).Source }

New-Item -ItemType Directory -Force -Path "$root\data\uploads", "$root\logs" | Out-Null

# Make sure the SQLite schema exists (idempotent).
& npx prisma db push --skip-generate | Out-Null

# Stop anything we started earlier.
& "$root\scripts\stop-public.ps1" -Quiet

# 1. App server
$server = Start-Process -FilePath "C:\Program Files\nodejs\node.exe" `
  -ArgumentList "node_modules\next\dist\bin\next", "start", "-p", "3000" `
  -WorkingDirectory $root -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput "$root\logs\server.log" -RedirectStandardError "$root\logs\server.err.log"
$server.Id | Set-Content "$root\data\server.pid"

# Wait until it answers.
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  try { $null = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -TimeoutSec 2; $ok = $true; break } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ok) { Write-Error "Server did not start. See logs\server.err.log"; exit 1 }

# 2. Tunnel
if (Test-Path "$root\logs\tunnel.log") { Remove-Item "$root\logs\tunnel.log" -Force }
$tunnel = Start-Process -FilePath $cloudflared `
  -ArgumentList "tunnel", "--url", "http://localhost:3000", "--no-autoupdate", "--logfile", "$root\logs\tunnel.log" `
  -WorkingDirectory $root -WindowStyle Hidden -PassThru
$tunnel.Id | Set-Content "$root\data\tunnel.pid"

$url = $null
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-Path "$root\logs\tunnel.log") {
    $m = Select-String -Path "$root\logs\tunnel.log" -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value; break }
  }
}
if (-not $url) { Write-Error "Tunnel did not report a URL. See logs\tunnel.log"; exit 1 }

$url | Set-Content "$root\data\public-url.txt"
Write-Host ""
Write-Host "traili is live:" -ForegroundColor Green
Write-Host "  $url"
Write-Host ""
Write-Host "Local:  http://localhost:3000"
Write-Host "Logs:   logs\server.log, logs\tunnel.log"
