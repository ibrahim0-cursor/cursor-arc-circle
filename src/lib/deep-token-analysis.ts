import type { TrendingToken } from "./dexscreener";
import { buildLocalTokenIntel } from "./token-intel-local";
import { mergeBirdeyeIntel, fetchTokenIntel, hasBirdeyeKey } from "./birdeye";
import { fetchDexPaprikaToken, paprikaIntelFromToken } from "./dexpaprika";
import { fetchMergedTokenDetection } from "./token-detection";
import { fetchCryptoNewsHeadlines, type CryptoNewsItem } from "./crypto-news";
import type { TokenIntel } from "./storage";
import { resolveTokenTechnical, technicalToIntel } from "./market-ta";

export type DeepAnalysisBundle = {
  intel: TokenIntel;
  news: CryptoNewsItem[];
  turnoverRatio: number;
  buySellRatio: number;
};

export async function buildDeepTokenIntel(token: TrendingToken): Promise<DeepAnalysisBundle> {
  const local = buildLocalTokenIntel(token);

  const [paprika, detection, news] = await Promise.all([
    fetchDexPaprikaToken(token.chainId, token.tokenAddress),
    fetchMergedTokenDetection(token.tokenAddress, token.chainId, {
      buys: token.txns24h?.buys ?? 0,
      sells: token.txns24h?.sells ?? 0,
      volume: token.volume24h,
    }),
    fetchCryptoNewsHeadlines(token.symbol, 6),
  ]);

  const paprikaIntel: Partial<TokenIntel> = paprika ? paprikaIntelFromToken(paprika) : {};
  const birdeyeIntel: Partial<TokenIntel> = hasBirdeyeKey()
    ? (await fetchTokenIntel(token.tokenAddress, token.chainId)).intel
    : {};

  let intel = mergeBirdeyeIntel(local, {
    ...paprikaIntel,
    ...birdeyeIntel,
    marketCap: paprikaIntel.marketCap ?? token.marketCap ?? birdeyeIntel.marketCap,
    fdv: paprikaIntel.fdv ?? token.fdv ?? birdeyeIntel.fdv,
    buy24h: detection.summary.buy24h ?? paprikaIntel.buy24h ?? token.txns24h?.buys,
    sell24h: detection.summary.sell24h ?? paprikaIntel.sell24h ?? token.txns24h?.sells,
    trade24h: paprikaIntel.trade24h ?? detection.summary.trade24h,
  });

  const det = detection.summary as {
    whaleCount?: number;
    sniperCount?: number;
    holderCount?: number;
    top10Pct?: number;
  };
  intel = {
    ...intel,
    whaleCount:
      det.whaleCount ??
      (detection.whales.length > 0 ? detection.whales.length : intel.whaleCount),
    sniperCount: det.sniperCount ?? intel.sniperCount,
    holderCount: det.holderCount ?? intel.holderCount,
    top10HolderPercent: det.top10Pct ?? intel.top10HolderPercent,
  };

  if (token.marketCap) intel = { ...intel, marketCap: token.marketCap };
  if (token.fdv) intel = { ...intel, fdv: token.fdv };

  const ta = await resolveTokenTechnical(token);
  intel = { ...intel, technical: technicalToIntel(ta) };

  const turnoverRatio =
    token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;
  const buySellRatio =
    (token.txns24h?.buys ?? intel.buy24h ?? 1) /
    Math.max(token.txns24h?.sells ?? intel.sell24h ?? 1, 1);

  return { intel, news, turnoverRatio, buySellRatio };
}
