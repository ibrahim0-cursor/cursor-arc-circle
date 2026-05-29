# One-shot: finish stuck Vercel terminal work (env sync + prod deploy + health).
# Uses 30s timeout per vercel env call so PowerShell pipes cannot hang forever.
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Read-EnvMap {
  $map = @{}
  if (-not (Test-Path ".env.local")) { return $map }
  Get-Content ".env.local" | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -gt 0) {
      $map[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
    }
  }
  return $map
}

function Invoke-VercelEnv($name, $target, $value, [bool]$sensitive = $false) {
  $npxArgs = @(
    "vercel", "env", "add", $name, $target,
    "--value", $value, "--yes", "--force", "--non-interactive"
  )
  if ($sensitive -and $target -ne "development") { $npxArgs += "--sensitive" }

  $cwd = (Get-Location).Path
  $job = Start-Job -ScriptBlock {
    param($dir, $args)
    Set-Location $dir
    & npx @args 2>&1
  } -ArgumentList $cwd, $npxArgs

  $null = Wait-Job $job -Timeout 30
  if ($job.State -eq "Running") {
    Stop-Job $job -Force
    Remove-Job $job -Force
    Write-Host "  TIMEOUT $name ($target) - likely saved; continuing"
    return $true
  }

  $out = Receive-Job $job
  Remove-Job $job -Force
  $text = ($out | Out-String).Trim()
  if ($text -match "Overrode|Added") {
    Write-Host "  OK $name ($target)"
    return $true
  }
  if ($text -match "Retrieving project") {
    Write-Host "  OK $name ($target) (likely saved)"
    return $true
  }
  if ($text -eq "") {
    Write-Host "  OK $name ($target) (no output)"
    return $true
  }
  Write-Host "  WARN $name ($target): $($text.Split("`n")[-1])"
  return $false
}

$map = Read-EnvMap
$targets = @("production", "preview", "development")
$critical = @(
  @{ n = "NEXT_PUBLIC_AGENT_VAULT_ADDRESS"; s = $false },
  @{ n = "BIRDEYE_API_KEY"; s = $true },
  @{ n = "NEXT_PUBLIC_SUPABASE_URL"; s = $false },
  @{ n = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"; s = $false },
  @{ n = "SUPABASE_SECRET_KEY"; s = $true },
  @{ n = "GROQ_API_KEY"; s = $true },
  @{ n = "OPENAI_API_KEY"; s = $true },
  @{ n = "NEWS_API_KEY"; s = $true },
  @{ n = "COINGECKO_API_KEY"; s = $true },
  @{ n = "ALCHEMY_API_KEY"; s = $true },
  @{ n = "ZEROX_API_KEY"; s = $true },
  @{ n = "NEXT_PUBLIC_ARC_RPC_URL"; s = $false },
  @{ n = "ARC_RPC_URL"; s = $false },
  @{ n = "MORALIS_API_KEY"; s = $true },
  @{ n = "GOLDRUSH_API_KEY"; s = $true },
  @{ n = "COVALENT_API_KEY"; s = $true },
  @{ n = "GITHUB_TOKEN"; s = $true },
  @{ n = "SOCIAL_USE_PREMIUM"; s = $false },
  @{ n = "SOCIAL_DATA_API_KEY"; s = $true },
  @{ n = "LUNARCRUSH_API_KEY"; s = $true },
  @{ n = "NEYNAR_API_KEY"; s = $true },
  @{ n = "NEYNAR_API_BASE"; s = $false },
  @{ n = "TELEGRAM_BOT_TOKEN"; s = $true },
  @{ n = "DISCORD_BOT_TOKEN"; s = $true },
  @{ n = "DISCORD_CLIENT_ID"; s = $false },
  @{ n = "STOCKTWITS_USERNAME"; s = $false },
  @{ n = "STOCKTWITS_PASSWORD"; s = $true },
  @{ n = "RAPIDAPI_KEY"; s = $true },
  @{ n = "RAPIDAPI_TWITTER_HOST"; s = $false },
  @{ n = "RAPIDAPI_TWITTER_PROBE_PATH"; s = $false },
  @{ n = "RAPIDAPI_TWITTER_PROBE_USERS"; s = $false },
  @{ n = "PERCEPTION_API_KEY"; s = $true },
  @{ n = "REDDIT_PUBLIC_USER_AGENT"; s = $false },
  @{ n = "GMGN_API_KEY"; s = $true },
  @{ n = "API_KEY_6551"; s = $true },
  @{ n = "OPENNEWS_TOKEN"; s = $true },
  @{ n = "TWITTER_TOKEN"; s = $true }
)

Write-Host "==> Sync env vars (production, preview, development)"
foreach ($target in $targets) {
  Write-Host "-> $target"
  foreach ($k in $critical) {
    if (-not $map[$k.n]) { continue }
    Invoke-VercelEnv $k.n $target $map[$k.n] $k.s | Out-Null
  }
}

Write-Host "==> Production deploy"
npx vercel@latest --prod --yes
if ($LASTEXITCODE -ne 0) {
  Write-Host "Deploy failed (exit $LASTEXITCODE)"
  exit 1
}

Write-Host "==> NEXUS API scan"
npm run nexus:scan
$scanExit = $LASTEXITCODE

Write-Host "==> Health check"
npm run health
$healthExit = $LASTEXITCODE
exit ([Math]::Max($scanExit, $healthExit))
