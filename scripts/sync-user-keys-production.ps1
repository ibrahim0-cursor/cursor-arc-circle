# One-time Production sync from .env.local (gitignored). Never commit secrets.
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

function Set-VercelEnv($name, $value, [bool]$sensitive = $true) {
  if (-not $value) { Write-Host "  SKIP $name (empty)"; return }
  $args = @("vercel", "env", "add", $name, "production", "--value", $value, "--yes", "--force", "--non-interactive")
  if ($sensitive) { $args += "--sensitive" }
  $out = & npx @args 2>&1 | Out-String
  if ($out -match "Overrode|Added") { Write-Host "  OK $name" }
  else { Write-Host "  WARN $name : $($out.Trim().Split("`n")[-1])" }
}

$pull = Read-EnvMap ".env.prod.pull"
$local = Read-EnvMap ".env.local"
$map = @{}
foreach ($k in ($pull.Keys + $local.Keys)) {
  if ($local.ContainsKey($k) -and $local[$k]) { $map[$k] = $local[$k] }
  elseif ($pull.ContainsKey($k) -and $pull[$k]) { $map[$k] = $pull[$k] }
}

$names = @(
  "OPENAI_API_KEY", "NEWS_API_KEY", "ALCHEMY_API_KEY", "BIRDEYE_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "ZEROX_API_KEY", "COINGECKO_API_KEY", "GROQ_API_KEY", "SUPABASE_ACCESS_TOKEN",
  "NEYNAR_API_KEY", "NEYNAR_API_BASE", "LUNARCRUSH_API_KEY", "SOCIAL_DATA_API_KEY",
  "TELEGRAM_BOT_TOKEN", "DISCORD_BOT_TOKEN", "DISCORD_CLIENT_ID",
  "STOCKTWITS_USERNAME", "STOCKTWITS_PASSWORD", "GMGN_API_KEY", "GMGN_PRIVATE_KEY",
  "API_KEY_6551", "SOCIAL_USE_PREMIUM", "MORALIS_API_KEY", "PERCEPTION_API_KEY",
  "RAPIDAPI_KEY", "NEXT_PUBLIC_ARC_RPC_URL", "ARC_RPC_URL", "CIRCLE_API_KEY",
  "NEXT_PUBLIC_ALCHEMY_BASE_RPC", "NEXT_PUBLIC_ALCHEMY_ETH_RPC", "GROQ_MODEL"
)

Write-Host "==> Sync $($names.Count) vars to Production"
foreach ($n in $names) {
  if ($map[$n]) { Set-VercelEnv $n $map[$n] $true }
}

# Ensure 6551 uses single key (remove stale overrides)
foreach ($stale in @("OPENNEWS_TOKEN", "TWITTER_TOKEN")) {
  npx vercel env rm $stale production --yes 2>$null | Out-Null
}

Write-Host "==> Done (removed OPENNEWS_TOKEN/TWITTER_TOKEN if present)"
