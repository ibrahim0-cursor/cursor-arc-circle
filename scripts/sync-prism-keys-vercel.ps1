# Sync PRISM-related keys from .env.local to Vercel (all targets). Never commit .env.local.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Read-EnvMap($path) {
  $map = @{}
  if (-not (Test-Path $path)) { return $map }
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -gt 0) {
      $map[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
    }
  }
  return $map
}

function Set-VercelEnv($name, $value, $target, [bool]$sensitive = $true) {
  if (-not $value) { return }
  $args = @("vercel", "env", "add", $name, $target, "--value", $value, "--yes", "--force", "--non-interactive")
  if ($sensitive) { $args += "--sensitive" }
  npx @args 2>&1 | Out-Null
}

$map = Read-EnvMap ".env.local"
$names = @(
  "NEWS_API_KEY", "EVENT_REGISTRY_API_KEY", "FRED_API_KEY",
  "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "OPENROUTER_REFERER", "OPENROUTER_APP_NAME",
  "DUNE_API_KEY", "DUNE_PRISM_QUERY_ID"
)

foreach ($target in @("production", "preview", "development")) {
  Write-Host "==> Vercel $target"
  foreach ($n in $names) {
    if ($map[$n]) {
      Set-VercelEnv $n $map[$n] $target $true
      Write-Host "  OK $n"
    }
  }
}

Write-Host "==> Done. Redeploy production for env to apply."
