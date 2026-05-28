/**
 * Curate live feed vs alpha scan — hide blue chips, favor movers & discovery names.
 */

import type { TrendingToken } from "./dexscreener";
import { isStablecoin } from "./token-filters";

const BLUE_CHIP_SYMBOLS = new Set([
  "weth",
  "eth",
  "ether",
  "wbtc",
  "btc",
  "cbbtc",
  "sol",
  "wsol",
  "arb",
  "bnb",
  "matic",
  "pol",
  "link",
  "uni",
  "aave",
  "dai",
  "usdc",
  "usdt",
  "op",
  "avax",
  "doge",
  "xrp",
  "ada",
  "trx",
  "ton",
  "pepe",
  "shib",
]);

const BLUE_CHIP_NAME_HINTS = [
  "wrapped ether",
  "wrapped bitcoin",
  "coinbase wrapped",
  "ethereum",
  "solana",
  "arbitrum",
  "chainlink",
  "uniswap",
];

export function tokenKey(t: { chainId: string; tokenAddress: string }): string {
  return `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
}

export function isBlueChip(symbol: string, name?: string): boolean {
  const sym = symbol.replace(/^\$/, "").trim().toLowerCase();
  if (BLUE_CHIP_SYMBOLS.has(sym)) return true;
  if (/^w(eth|btc|sol)$/i.test(sym)) return true;
  const n = (name ?? "").toLowerCase();
  return BLUE_CHIP_NAME_HINTS.some((h) => n.includes(h));
}

function turnover(t: TrendingToken): number {
  return t.liquidityUsd > 0 ? t.volume24h / t.liquidityUsd : 0;
}

function buyPressure(t: TrendingToken): number {
  const b = t.txns24h?.buys ?? 0;
  const s = t.txns24h?.sells ?? 1;
  return b / Math.max(s, 1);
}

function isFeedExcluded(t: TrendingToken): boolean {
  return (
    isStablecoin(t.symbol, t.name, {
      tokenAddress: t.tokenAddress,
      chainId: t.chainId,
      priceUsd: t.priceUsd,
      change24h: t.change24h,
    }) || isBlueChip(t.symbol, t.name)
  );
}

/** Live feed: tradable alts with real movement (not mega-cap wrappers). */
export function scoreLiveFeedToken(t: TrendingToken): number {
  if (isFeedExcluded(t)) return -1000;

  let score = 0;
  const ch = Math.abs(t.change24h);
  if (ch >= 4 && ch <= 120) score += Math.min(40, ch * 0.45);
  if (ch > 120) score -= 15;

  const mc = t.marketCap ?? t.fdv ?? 0;
  if (mc > 0 && mc < 80_000_000) score += 18;
  else if (mc > 0 && mc < 500_000_000) score += 8;
  else if (mc > 2_000_000_000) score -= 25;

  if (t.liquidityUsd >= 40_000 && t.liquidityUsd <= 8_000_000) score += 14;
  if (t.liquidityUsd < 25_000) score -= 20;

  const turn = turnover(t);
  if (turn >= 0.35 && turn <= 12) score += Math.min(18, turn * 2);
  if (turn > 40) score -= 12;

  const bp = buyPressure(t);
  if (bp > 1.1) score += 8;
  if (bp < 0.85) score -= 6;

  if (t.volume24h > 80_000) score += Math.min(12, t.volume24h / 500_000);

  return score;
}

/** Alpha: favor strong movers + signal-friendly liquidity. */
export function scoreAlphaCandidate(t: TrendingToken): number {
  if (isFeedExcluded(t)) return -1000;

  let score = scoreLiveFeedToken(t);
  const ch = t.change24h;
  if (ch >= 15 && ch <= 200) score += 25;
  if (ch >= 50) score += 12;
  if (ch < -35) score -= 8;

  const h1 = t.priceChange?.h1 ?? 0;
  if (h1 > 8 && ch > 0) score += 10;

  return score;
}

export function curateLiveFeed<T extends TrendingToken>(tokens: T[], limit: number): T[] {
  return [...tokens]
    .filter((t) => scoreLiveFeedToken(t) > 0)
    .sort((a, b) => scoreLiveFeedToken(b) - scoreLiveFeedToken(a))
    .slice(0, limit);
}

export function curateAlphaCandidates<T extends TrendingToken>(
  tokens: T[],
  liveKeys: Set<string>,
  limit: number,
  maxLiveOverlap = 3,
): T[] {
  const ranked = [...tokens]
    .filter((t) => scoreAlphaCandidate(t) > 0)
    .sort((a, b) => scoreAlphaCandidate(b) - scoreAlphaCandidate(a));

  const out: T[] = [];
  let overlap = 0;
  for (const t of ranked) {
    const k = tokenKey(t);
    const inLive = liveKeys.has(k);
    if (inLive && overlap >= maxLiveOverlap) continue;
    if (inLive) overlap++;
    out.push(t);
    if (out.length >= limit) break;
  }

  if (out.length < Math.min(limit, 6)) {
    for (const t of ranked) {
      const k = tokenKey(t);
      if (out.some((x) => tokenKey(x) === k)) continue;
      out.push(t);
      if (out.length >= limit) break;
    }
  }

  return out;
}
