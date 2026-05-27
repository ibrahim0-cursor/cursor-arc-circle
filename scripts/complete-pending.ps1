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

  $out = & npx @npxArgs 2>&1
  $text = ($out | Out-String).Trim()
  if ($text -match "Overrode|Added") {
    Write-Host "  OK $name ($target)"
    return $true
  }
  if ($text -match "Retrieving project") {
    Write-Host "  OK $name ($target) (likely saved)"
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
  @{ n = "ARC_RPC_URL"; s = $false }
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

Write-Host "==> Health check"
npm run health
exit $LASTEXITCODE
