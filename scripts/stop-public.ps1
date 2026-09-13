param([switch]$Quiet)
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

foreach ($name in @("server", "tunnel")) {
  $pidFile = "$root\data\$name.pid"
  if (Test-Path $pidFile) {
    $procId = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($procId) {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      if (-not $Quiet) { Write-Host "stopped $name ($procId)" }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }
}
