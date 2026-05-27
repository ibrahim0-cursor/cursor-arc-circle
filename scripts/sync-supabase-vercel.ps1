# Sync Supabase keys from .env.local to Vercel production (no values printed)
$ErrorActionPreference = "Continue"
Set-Location (Split-Path -Parent $PSScriptRoot)
$names = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_AGENT_VAULT_ADDRESS"
)
$map = @{}
Get-Content ".env.local" | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $i = $line.IndexOf("=")
  if ($i -gt 0) { $map[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim() }
}
foreach ($name in $names) {
  if (-not $map[$name]) { continue }
  Write-Host "env $name -> production"
  $sensitive = $name -match "SECRET|SERVICE_ROLE"
  $args = @("vercel", "env", "add", $name, "production", "--value", $map[$name], "--yes", "--force", "--non-interactive")
  if ($sensitive) { $args += "--sensitive" }
  & npx @args 2>&1 | Out-Null
}
Write-Host "Done"
