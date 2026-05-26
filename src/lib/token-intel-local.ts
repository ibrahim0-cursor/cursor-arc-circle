import type { TokenIntel } from "./storage";
import type { TrendingToken } from "./dexscreener";
import { computeTechnicalAnalysis, normalizePriceChanges } from "./technical-analysis";

/** Fast local intel from DexScreener — no Birdeye (used for feed + deep scan) */
export function buildLocalTokenIntel(token: TrendingToken): TokenIntel {
  const ta = computeTechnicalAnalysis(
    token.priceUsd,
    normalizePriceChanges(token.priceChange, token.change24h),
    token.volume24h,
    token.liquidityUsd,
  );

  const buys = token.txns24h?.buys ?? 0;
  const sells = token.txns24h?.sells ?? 0;
  const ratio = buys / Math.max(sells, 1);

  return {
    marketCap: token.marketCap,
    fdv: token.fdv,
    buy24h: buys,
    sell24h: sells,
    trade24h: buys + sells,
    sniperCount:
      buys > 2000 ? Math.min(15, Math.ceil(buys / 600)) : buys > 400 ? Math.ceil(buys / 900) : 0,
    whaleCount: token.liquidityUsd > 1_000_000 ? 5 : token.liquidityUsd > 250_000 ? 3 : 1,
    insiderCount: ratio > 2 && buys > 500 ? Math.min(5, Math.ceil(buys / 1200)) : 0,
    holderCount:
      token.marketCap && token.priceUsd > 0
        ? Math.max(50, Math.round(token.marketCap / token.priceUsd / 80))
        : buys + sells > 0
          ? Math.max(20, Math.round((buys + sells) * 0.8))
          : token.liquidityUsd > 100_000
            ? Math.round(token.liquidityUsd / 25_000)
            : undefined,
    top10HolderPercent: undefined,
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
