import type { TrendingToken } from "./dexscreener";
import { buildLocalTokenIntel } from "./token-intel-local";
import { mergeBirdeyeIntel } from "./birdeye";
import { fetchDexPaprikaToken, paprikaIntelFromToken } from "./dexpaprika";
import { fetchMergedTokenDetection } from "./token-detection";
import type { CryptoNewsItem } from "./crypto-news";
import {
  fetchCommunityPulse,
  fetchCommunityPulseLite,
  type CommunityPulse,
} from "./community-pulse";
import { fetchMoralisTokenMeta, hasMoralisKey } from "./moralis";
import type { TokenIntel } from "./storage";
import { resolveTokenTechnical, technicalToIntel } from "./market-ta";
import { tokenSocialFromIntel, type TokenSocialIntel } from "./social-intel";
import { enrichTokenIntelWithGmgn } from "./gmgn-enrichment";
import { getBirdeyePlan, type BirdeyeScanKind } from "./birdeye-policy";

export type DeepAnalysisBundle = {
  intel: TokenIntel;
  news: CryptoNewsItem[];
  social: TokenSocialIntel;
  community: CommunityPulse;
  turnoverRatio: number;
  buySellRatio: number;
  gmgnLines?: string[];
  gmgnSecurity?: unknown;
};

export type DeepIntelOptions = {
  scanKind?: BirdeyeScanKind;
  tokenIndex?: number;
  /** Skip per-token GMGN API (bulk alpha) */
  skipGmgnEnrich?: boolean;
};

function intelFromDetectionSummary(
  summary: Record<string, unknown>,
): Partial<TokenIntel> {
  return {
    holderCount: summary.holderCount as number | undefined,
    sniperCount: summary.sniperCount as number | undefined,
    top10HolderPercent: summary.top10Pct as number | undefined,
    buy24h: summary.buy24h as number | undefined,
    sell24h: summary.sell24h as number | undefined,
    whaleCount: summary.whaleCount as number | undefined,
  };
}

export async function buildDeepTokenIntel(
  inputToken: TrendingToken,
  opts?: DeepIntelOptions,
): Promise<DeepAnalysisBundle> {
  let token = inputToken;
  const local = buildLocalTokenIntel(token);
  const plan = getBirdeyePlan(opts?.scanKind ?? "analyze", opts?.tokenIndex ?? 0);

  const [paprika, detection, community] = await Promise.all([
    fetchDexPaprikaToken(token.chainId, token.tokenAddress),
    fetchMergedTokenDetection(
      token.tokenAddress,
      token.chainId,
      {
        buys: token.txns24h?.buys ?? 0,
        sells: token.txns24h?.sells ?? 0,
        volume: token.volume24h,
      },
      { birdeyeMode: plan.detection },
    ),
    opts?.scanKind === "alpha"
      ? fetchCommunityPulseLite(token.symbol, token.name)
      : fetchCommunityPulse(token.symbol, token.name),
  ]);

  const social = community.social ?? {
    symbol: token.symbol.toUpperCase(),
    lunarcrush: null,
    lunarcrushPosts: [],
    reddit: [],
    farcaster: [],
    status: { lunarcrush: "missing", reddit: "missing", neynar: "missing" },
    hasData: false,
  };

  const news: CryptoNewsItem[] = community.items
    .filter((i) => i.kind === "news" || i.kind === "meme")
    .map((i) => ({
      title: i.title,
      source: i.source,
      link: i.link ?? "",
      category: i.kind,
    }))
    .slice(0, 8);

  const paprikaIntel: Partial<TokenIntel> = paprika ? paprikaIntelFromToken(paprika) : {};
  const detIntel = intelFromDetectionSummary(detection.summary as Record<string, unknown>);

  let intel = mergeBirdeyeIntel(local, {
    ...paprikaIntel,
    ...detIntel,
    marketCap: paprikaIntel.marketCap ?? token.marketCap,
    fdv: paprikaIntel.fdv ?? token.fdv,
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

  if (hasMoralisKey() && !token.icon) {
    const moralis = await fetchMoralisTokenMeta(token.chainId, token.tokenAddress);
    if (moralis?.logo) token = { ...token, icon: moralis.logo, name: moralis.name ?? token.name };
  }

  const ta = await resolveTokenTechnical(token, { allowBirdeyeOhlcv: plan.ohlcv });
  intel = { ...intel, technical: technicalToIntel(ta), social: tokenSocialFromIntel(social) };

  let gmgnLines: string[] | undefined;
  let gmgnSecurity: unknown;
  if (!opts?.skipGmgnEnrich) {
    const gmgn = await enrichTokenIntelWithGmgn(token.chainId, token.tokenAddress, intel);
    intel = gmgn.intel;
    gmgnLines = gmgn.enrichment?.lines;
    gmgnSecurity = gmgn.gmgnSecurity;
  }

  const turnoverRatio =
    token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;
  const buySellRatio =
    (token.txns24h?.buys ?? intel.buy24h ?? 1) /
    Math.max(token.txns24h?.sells ?? intel.sell24h ?? 1, 1);

  return {
    intel,
    news,
    social,
    community,
    turnoverRatio,
    buySellRatio,
    gmgnLines,
    gmgnSecurity,
  };
}
