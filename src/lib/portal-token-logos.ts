import type { CryptoId } from "@/components/landing/arc-crypto-icons";

/** CoinGecko CDN fallbacks when API is unavailable */
const COINGECKO_FALLBACK: Record<CryptoId, string> = {
  btc: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  eth: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  sol: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  usdc: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  usdt: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
};

/** All five portal logos from CoinGecko (no local overrides) */
export function mergePortalTokenLogos(
  remote: Partial<Record<CryptoId, string>> | null,
): Record<CryptoId, string> {
  const out = { ...COINGECKO_FALLBACK };
  if (remote) {
    for (const id of Object.keys(remote) as CryptoId[]) {
      if (remote[id]) out[id] = remote[id]!;
    }
  }
  return out;
}

export const DEFAULT_PORTAL_LOGOS = mergePortalTokenLogos(null);
