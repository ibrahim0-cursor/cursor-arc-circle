# Sync BIRDEYE_API_KEY from .env.local to Vercel (requires: npm i -g vercel && vercel login)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env.local"
if (-not (Test-Path $envFile)) { throw ".env.local not found" }

$key = $null
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*BIRDEYE_API_KEY\s*=\s*(.+)\s*$') {
    $key = $matches[1].Trim().Trim('"').Trim("'")
  }
}
if (-not $key) { throw "BIRDEYE_API_KEY not found in .env.local" }

if (-not (Test-Path (Join-Path $root ".vercel\project.json"))) {
  Write-Host "Linking project to Vercel (first time)..."
  Set-Location $root
  npx vercel link --yes
  if ($LASTEXITCODE -ne 0) { throw "vercel link failed — pick your cursor-arc-circle project in the prompt" }
}

Write-Host "Pushing BIRDEYE_API_KEY to Vercel (production, preview, development)..."
Set-Location $root
$key | npx vercel env add BIRDEYE_API_KEY production --yes --force
$key | npx vercel env add BIRDEYE_API_KEY preview --yes --force
$key | npx vercel env add BIRDEYE_API_KEY development --yes --force
Write-Host "Done. Redeploy: Vercel dashboard -> Redeploy, or: npx vercel --prod"
