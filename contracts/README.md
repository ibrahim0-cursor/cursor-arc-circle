# MERIDIAN Counter on Arc Testnet

Official Arc tutorial contract ([Deploy on Arc](https://docs.arc.io/)), wired into the Next.js app at `/arc`.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation): `curl -L https://foundry.paradigm.xyz | bash` then `foundryup`
- Arc Testnet USDC for gas ([Circle Faucet](https://faucet.circle.com/) → Arc Testnet)

## One-time setup

```bash
cd contracts
forge install foundry-rs/forge-std --no-commit
```

## Test locally

```bash
forge test
```

## Deploy to Arc Testnet

Create `contracts/.env` (never commit):

```env
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
PRIVATE_KEY=0x...your_testnet_key...
```

```bash
source .env   # Git Bash / macOS / Linux
# Windows PowerShell: $env:PRIVATE_KEY="0x..."

forge script script/Counter.s.sol:CounterScript \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

Copy the **Deployed to:** address, then set in the **repo root** `.env.local` and Vercel:

```env
NEXT_PUBLIC_ARC_COUNTER_ADDRESS=0xYourDeployedAddress
```

Redeploy the Vercel app (or restart `npm run dev`). Open **https://your-app/arc** to read and increment the on-chain counter from your wallet.

## Alternative: `forge create`

```bash
forge create src/Counter.sol:Counter \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## What this enables in the app

| Feature | Without contract | With `NEXT_PUBLIC_ARC_COUNTER_ADDRESS` |
|--------|------------------|--------------------------------------|
| Wallet on Arc | Fee anchor txs only | Same + live contract reads |
| `/arc` page | Deploy instructions | Read `number()`, call `increment()` |
| Proof of deploy | — | Explorer link to your contract |

This is separate from PRISM/NEXUS fee txs (those use calldata anchors, not this contract).
