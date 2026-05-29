/**
 * GMGN read hygiene — only surface tokens with real market fields from OpenAPI.
 */

import type { TrendingToken } from "./dexscreener";

/** True when GMGN returned at least one numeric market field (not an empty shell). */
export function hasRealGmgnMarketFields(t: TrendingToken): boolean {
  return (
    (t.priceUsd ?? 0) > 0 ||
    (t.volume24h ?? 0) > 0 ||
    (t.liquidityUsd ?? 0) > 0 ||
    (t.marketCap ?? 0) > 0
  );
}

export function filterRealGmgnMarketTokens(tokens: TrendingToken[]): TrendingToken[] {
  return tokens.filter(hasRealGmgnMarketFields);
}

/** Signal / trade rows must have address + symbol from GMGN (price may be filled by Dex enrich). */
export function hasGmgnIdentity(t: TrendingToken): boolean {
  return Boolean(t.tokenAddress?.trim() && t.symbol?.trim());
}
