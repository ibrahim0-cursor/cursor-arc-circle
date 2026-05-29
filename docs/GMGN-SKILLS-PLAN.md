# GMGN skills — ban-safe usage plan

MERIDIAN uses **all GMGN catalog skills** via OpenAPI on Vercel (`/api/nexus/gmgn/analytics`, `/monitor`, discovery feeds).  
`npx skills add GMGNAI/gmgn-skills` is optional for **Cursor on your laptop** only; production does not run the CLI.

## Why bans happened

| Cause | Fix in app |
|--------|------------|
| `/api/status` fired **~10 GMGN calls in parallel** (5 analytics + 3 monitor + rank probe) | Light status probe (1 call) by default |
| Live Feed + Alpha Scan each ran **5 discovery + 5 monitor skills in parallel** | **Sequential** skills + **10 min cache** |
| No gap between HTTP calls | **1.5s minimum gap** between GMGN requests (configurable) |
| Repeated Recheck / page loads | Cache + reuse bundle; don’t re-probe all skills |

## How we use every skill (without hammering the API)

### Tier 1 — Background (cached bundles)

| Skills | When | Budget |
|--------|------|--------|
| `five-min-trending`, `pump-fun-trending`, `newly-created-tokens`, `kol-bought-new`, `near-graduation` | Live Feed + Alpha discovery | 1 bundle / 10 min, **sequential** (~7s total) |
| `smart-money-buy-signal`, `price-surge-signal`, `kol-call-signal`, `smart-money-trades`, `kol-trade-activity` | Alpha monitor feed | Same pattern, separate cache |

### Tier 2 — On demand (per token)

| Skills | When | Budget |
|--------|------|--------|
| `token-overview`, `token-security-check`, `top-holders`, `smart-money-holders`, `kol-holders`, `token-kline`, `liquidity-pool` | User opens dossier / Analyze | Only for **that mint**, sequential, cached 10 min |

### Tier 3 — Trading (private key)

| Skills | When |
|--------|------|
| `gmgn-cooking` | Copy-trade / live trade routes only; requires `GMGN_PRIVATE_KEY` |

### Tier 4 — 6551 (not GMGN API)

| `opennews-mcp`, `opentwitter-mcp` | Use `API_KEY_6551` on 6551.io — not GMGN OpenAPI |

## Operator rules

1. **Recheck** integrations once after deploy — not in a loop.
2. **Alpha Scan** at most once per few minutes (heavy bundle).
3. Upload **public Ed25519** on gmgn.ai matching `GMGN_PRIVATE_KEY`.
4. Optional Vercel env tuning:

| Variable | Default | Purpose |
|----------|---------|---------|
| `GMGN_MIN_GAP_MS` | `1500` | Min ms between GMGN HTTP calls |
| `GMGN_CACHE_MINUTES` | `10` | Cache TTL for read skills |
| `GMGN_LIGHT_STATUS_PROBE` | `true` | Status uses 1 ping, not 8 skill probes |
| `GMGN_STATUS_FULL_PROBE` | `false` | Set `true` only when debugging |

## Skills panel in NEXUS

Install in UI = enable route + show CLI hint. Server calls go through **rate budget** automatically.
