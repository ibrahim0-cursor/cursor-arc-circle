import type { CryptoId } from "@/components/landing/arc-crypto-icons";

/** Blue USDC + green USDT — user-provided; others from CoinGecko when available */
export const LOCAL_TOKEN_LOGOS: Record<CryptoId, string> = {
  btc: "/tokens/btc.png",
  eth: "/tokens/eth.png",
  sol: "/tokens/sol.png",
  usdc: "/tokens/usdc-blue.png",
  usdt: "/tokens/usdt-green.png",
};

const COINGECKO_FALLBACK: Record<CryptoId, string> = {
  btc: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  eth: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  sol: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  usdc: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  usdt: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
};

export function mergePortalTokenLogos(
  remote: Partial<Record<CryptoId, string>> | null,
): Record<CryptoId, string> {
  const out = { ...COINGECKO_FALLBACK };
  if (remote) {
    for (const id of Object.keys(remote) as CryptoId[]) {
      if (remote[id]) out[id] = remote[id]!;
    }
  }
  out.usdc = LOCAL_TOKEN_LOGOS.usdc;
  out.usdt = LOCAL_TOKEN_LOGOS.usdt;
  return out;
}

export const DEFAULT_PORTAL_LOGOS = mergePortalTokenLogos(null);
