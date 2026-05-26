# Sync .env.local -> Vercel (preview, development). Each command times out after 25s.
$ErrorActionPreference = "Continue"
Set-Location (Split-Path -Parent $PSScriptRoot)

$targets = @("preview", "development")
$keys = @(
  @{ n = "NEXT_PUBLIC_SUPABASE_URL"; s = $false },
  @{ n = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"; s = $false },
  @{ n = "SUPABASE_SECRET_KEY"; s = $true },
  @{ n = "GROQ_API_KEY"; s = $true },
  @{ n = "OPENAI_API_KEY"; s = $true },
  @{ n = "BIRDEYE_API_KEY"; s = $true },
  @{ n = "NEWS_API_KEY"; s = $true },
  @{ n = "COINGECKO_API_KEY"; s = $true },
  @{ n = "ALCHEMY_API_KEY"; s = $true },
  @{ n = "ZEROX_API_KEY"; s = $true },
  @{ n = "NEXT_PUBLIC_ARC_RPC_URL"; s = $false },
  @{ n = "ARC_RPC_URL"; s = $false }
)

$map = @{}
Get-Content ".env.local" | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $i = $line.IndexOf("=")
  if ($i -gt 1) { $map[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim() }
}

function Invoke-VercelEnvAdd($name, $target, $value, $sensitive) {
  $args = @("vercel", "env", "add", $name, $target, "--value", $value, "--yes", "--force", "--non-interactive")
  # Development does not support --sensitive; Production/Preview do.
  if ($sensitive -and $target -ne "development") { $args += "--sensitive" }

  $cwd = (Get-Location).Path
  $job = Start-Job -ScriptBlock {
    param($dir, $npxArgs)
    Set-Location $dir
    & npx @npxArgs 2>&1
  } -ArgumentList $cwd, $args

  $null = Wait-Job $job -Timeout 25
  if ($job.State -eq "Running") {
    Stop-Job $job -Force
    Remove-Job $job -Force
    Write-Host "  TIMEOUT $name ($target) - likely saved; verify with vercel env ls"
    return
  }

  $out = Receive-Job $job
  Remove-Job $job -Force
  $out | Select-Object -Last 4 | ForEach-Object { Write-Host "  $_" }
}

foreach ($target in $targets) {
  Write-Host "==> $target"
  foreach ($k in $keys) {
    if (-not $map[$k.n]) { continue }
    Write-Host " $ $($k.n)"
    Invoke-VercelEnvAdd $k.n $target $map[$k.n] $k.s
  }
}

Write-Host "==> Complete. Production keys were already set."
