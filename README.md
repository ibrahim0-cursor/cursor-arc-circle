# ARC CIRCLE — Agent Intelligence Suite

Two production-grade AI agents for the **Agora Agents Hackathon** (Circle × Arc):

| Product | Purpose | Stack |
|---------|---------|-------|
| **NEXUS** | Autonomous trading agent | DexScreener · OpenAI · Circle Wallets · Arc anchoring |
| **PRISM** | Macro & geopolitical oracle | GDELT · NewsAPI · Claude · Arc anchoring |

## Live routes

- `/` — Landing hub
- `/nexus` — Trading agent console
- `/prism` — Forecasting oracle

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment

Copy `.env.example` to `.env.local` and add:

- `OPENAI_API_KEY` — NEXUS decision engine
- `ANTHROPIC_API_KEY` — PRISM forecasting engine
- `NEWS_API_KEY` — NewsAPI headlines (optional but recommended)
- `CIRCLE_API_KEY` — `ENTITY_ID:API_KEY:SECRET` from Circle sandbox
- `CIRCLE_KIT_KEY` — Circle App Kit key
- `ARC_AGENT_PRIVATE_KEY` — optional funded Arc testnet key for on-chain anchors

Without API keys, both agents still run in **heuristic demo mode** using live DexScreener + GDELT data.

## Hackathon alignment

- **Agentic sophistication** — autonomous BUY/SELL/HOLD and probability forecasts
- **Circle usage** — sandbox wallet provisioning + USDC-native agent treasury
- **Arc settlement** — decision payloads anchored on Arc testnet
- **Traction-ready UI** — premium glass interface built for demo video + live users

## NEXUS v2 features

- **Contract address** on every token (copy button)
- **Live DexScreener chart** embed per token
- **Birdeye intel**: market cap, snipers, holders, concentration risk
- **Reasoning breakdown**: factor-by-factor why BUY / SELL / HOLD
- **Wallet connect** (MetaMask / injected wallet)
- **Swap panel**: 0x quotes on Base/Ethereum, Jupiter link for Solana

## Deploy to Vercel

1. Push this repo to [github.com/ibrahim0-cursor/cursor-arc-circle](https://github.com/ibrahim0-cursor/cursor-arc-circle)
2. Go to [vercel.com/new](https://vercel.com/new) → Import GitHub repo
3. Add environment variables from `.env.example`
4. Deploy — root directory is `/`, framework Next.js auto-detected

Required env vars for full NEXUS: `OPENAI_API_KEY`, `BIRDEYE_API_KEY`, `NEWS_API_KEY`, `CIRCLE_API_KEY`, `ALCHEMY_API_KEY`, `NEXT_PUBLIC_ALCHEMY_BASE_RPC`

Optional: `ZEROX_API_KEY` for on-chain EVM swap execution

### Supabase setup (required for Vercel persistence)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/pjtkiktpdvhghkqwqpok/sql)
2. Run the SQL in `supabase/schema.sql` (includes `demo_portfolios` for mobile demo trades)
3. In Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`
4. Verify: `npm run health` — `demoPortfolio.tableOk` should be `true`

### No OpenAI / Claude?

The app runs fully in **heuristic mode** using DexScreener, Birdeye, GDELT, and NewsAPI — no paid AI keys needed.

## Repository

[github.com/ibrahim0-cursor/cursor-arc-circle](https://github.com/ibrahim0-cursor/cursor-arc-circle)

## Submission checklist

- [ ] Public GitHub repo
- [ ] 3-minute Loom demo covering NEXUS + PRISM
- [ ] Live deployed URL
- [ ] Report traction in submission form

Built for Agora · Canteen × Circle · 2026
