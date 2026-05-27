import type { PortalTokenId } from "@/lib/portal-tokens";
import { PORTAL_TOKEN_IDS } from "@/lib/portal-tokens";

const COINGECKO_FALLBACK: Record<PortalTokenId, string> = {
  btc: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  eth: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  sol: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  usdc: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
};

export function mergePortalTokenLogos(
  remote: Partial<Record<PortalTokenId, string>> | null,
): Record<PortalTokenId, string> {
  const out = { ...COINGECKO_FALLBACK };
  if (remote) {
    for (const id of PORTAL_TOKEN_IDS) {
      if (remote[id]) out[id] = remote[id]!;
    }
  }
  return out;
}

export const DEFAULT_PORTAL_LOGOS = mergePortalTokenLogos(null);
