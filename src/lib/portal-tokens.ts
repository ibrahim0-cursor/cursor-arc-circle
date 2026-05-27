/** Tokens shown on home portal orbit (no USDT) */
export const PORTAL_TOKEN_IDS = ["btc", "eth", "sol", "usdc"] as const;

export type PortalTokenId = (typeof PORTAL_TOKEN_IDS)[number];

export const PORTAL_COINGECKO_IDS: Record<PortalTokenId, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  usdc: "usd-coin",
};
