# Security — MERIDIAN (trader-arc.vercel.app)

## What we protect

- **Your keys stay in your wallet.** MERIDIAN uses browser wallet injection (MetaMask, etc.). We never store seed phrases or private keys.
- **Server agent keys** (`ARC_AGENT_PRIVATE_KEY`, deploy secrets) live only in Vercel env — never in the client bundle or public API responses.
- **HTTP hardening:** security headers (CSP, frame ancestors, nosniff, HSTS on production).
- **Connect flow:** first connect per session shows a safety notice; unofficial hostnames block connect.
- **API validation:** wallet query params must be valid `0x` + 40 hex addresses.

## What you should do

1. Use only **https://trader-arc.vercel.app** (check the URL bar).
2. Never paste your seed phrase or private key into any website, including impersonators.
3. Read every wallet popup: network (Arc Testnet **5042002**), USDC amount, and contract.
4. Treat testnet USDC as disposable — not mainnet funds.
5. Disconnect when done (header wallet menu → Disconnect).

## Report issues

Email: **abdullahlp114@gmail.com** · X: [@velz_noct](https://x.com/velz_noct)

Include steps to reproduce and, if relevant, a testnet tx hash (no private keys).

## Scope limits

- Testnet MVP — not audited, not mainnet-ready.
- We cannot recover funds lost to phishing or wrong-chain approvals.
- Third-party APIs (DexScreener, Birdeye, etc.) have their own availability and rate limits.
