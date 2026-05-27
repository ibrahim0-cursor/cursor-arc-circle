# Fast sync .env.local -> Vercel production only (25s timeout per var)
$ErrorActionPreference = "Continue"
Set-Location (Split-Path -Parent $PSScriptRoot)

$skip = @("SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF", "SUPABASE_DB_PASSWORD", "SUPABASE_DB_URL")
$map = @{}
Get-Content ".env.local" | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $i = $line.IndexOf("=")
  if ($i -lt 1) { return }
  $n = $line.Substring(0, $i).Trim()
  $v = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
  if ($v -ne "" -and $n -notin $skip) { $map[$n] = $v }
}

function Add-Env($name, $value) {
  $args = @("vercel", "env", "add", $name, "production", "--value", $value, "--yes", "--force", "--sensitive")
  $job = Start-Job -ScriptBlock {
    param($dir, $a)
    Set-Location $dir
    & npx @a 2>&1
  } -ArgumentList (Get-Location).Path, $args
  $null = Wait-Job $job -Timeout 20
  if ($job.State -eq "Running") { Stop-Job $job -Force }
  $out = Receive-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
  Write-Host "  $name"
}

Write-Host "==> Sync $($map.Count) vars to production (ibrahim26/trade-alpha)"
foreach ($name in ($map.Keys | Sort-Object)) {
  Add-Env $name $map[$name]
}
Write-Host "==> Done env sync"
