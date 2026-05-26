import type { TokenIntel } from "./storage";
import type { TrendingToken } from "./dexscreener";
import { computeTechnicalAnalysis, normalizePriceChanges } from "./technical-analysis";

/** DexScreener-only intel — no fabricated whale/sniper/holder counts */
export function buildLocalTokenIntel(token: TrendingToken): TokenIntel {
  const ta = computeTechnicalAnalysis(
    token.priceUsd,
    normalizePriceChanges(token.priceChange, token.change24h),
    token.volume24h,
    token.liquidityUsd,
  );

  const buys = token.txns24h?.buys ?? 0;
  const sells = token.txns24h?.sells ?? 0;

  return {
    marketCap: token.marketCap,
    fdv: token.fdv,
    buy24h: buys,
    sell24h: sells,
    trade24h: buys + sells,
    technical: {
      rsi: ta.rsi,
      rsiSignal: ta.rsiSignal,
      macd: ta.macd,
      macdSignal: ta.macdSignal,
      trend: ta.trend,
      trendLine: ta.trendLine,
      score: ta.score,
    },
  };
}
