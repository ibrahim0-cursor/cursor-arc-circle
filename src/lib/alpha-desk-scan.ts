/**
 * Alpha desk pass — Dex + Birdeye + GMGN structure (pro trader workflow, not AI chat).
 */

import type { TrendingToken } from "./dexscreener";
import { buildLocalTokenIntel } from "./token-intel-local";
import { getBirdeyePlan } from "./birdeye-policy";
import { fetchMergedTokenDetection } from "./token-detection";
import { resolveTokenTechnical, technicalToIntel } from "./market-ta";
import { scoreTokenSecurity } from "./token-security";
import { mergeGmgnIntoSecurityReport } from "./gmgn-enrichment";
import { enrichTokenIntelWithGmgn } from "./gmgn-enrichment";
import { hasGmgnApiKey } from "./gmgn-client";
import { runGmgnAnalyticsSkill, dexChainIdToGmgn } from "./gmgn-analytics";
import { assessTokenScam } from "./scam-detection";
import type { MacroRegime } from "./macro-regime";
import type { CommunityPulse } from "./community-pulse";
import type { TokenIntel } from "./storage";
import type { AlphaCandidate } from "./alpha-scan-engine";

export const EMPTY_ALPHA_COMMUNITY: CommunityPulse = {
  topic: "alpha-desk",
  items: [],
  headlines: [],
};

function intelFromDetection(summary: Record<string, unknown>): Partial<TokenIntel> {
  return {
    holderCount: summary.holderCount as number | undefined,
    sniperCount: summary.sniperCount as number | undefined,
    top10HolderPercent: summary.top10Pct as number | undefined,
    buy24h: summary.buy24h as number | undefined,
    sell24h: summary.sell24h as number | undefined,
    whaleCount: summary.whaleCount as number | undefined,
  };
}

async function withBudget<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Dex-first intel — Birdeye TA/holders on top ranks only; GMGN security on top 3. */
export async function buildAlphaDeskIntel(
  token: TrendingToken,
  tokenIndex: number,
): Promise<{
  token: TrendingToken;
  intel: TokenIntel;
  gmgnLines?: string[];
  gmgnSecurity?: unknown;
}> {
  const plan = getBirdeyePlan("alpha", tokenIndex);
  let intel = buildLocalTokenIntel(token);

  const [detection, ta] = await Promise.all([
    plan.detection !== "off"
      ? withBudget(
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
          8_000,
          null,
        )
      : Promise.resolve(null),
    plan.ohlcv
      ? withBudget(resolveTokenTechnical(token, { allowBirdeyeOhlcv: true }), 7_000, null)
      : Promise.resolve(null),
  ]);

  if (detection?.summary) {
    intel = { ...intel, ...intelFromDetection(detection.summary as Record<string, unknown>) };
    const det = detection.summary as { whaleCount?: number; sniperCount?: number };
    intel.whaleCount = det.whaleCount ?? detection.whales?.length ?? intel.whaleCount;
    intel.sniperCount = det.sniperCount ?? intel.sniperCount;
  }
  if (ta) intel = { ...intel, technical: technicalToIntel(ta) };

  let gmgnLines: string[] | undefined;
  let gmgnSecurity: unknown;
  if (tokenIndex < 3 && hasGmgnApiKey()) {
    const gmgn = await withBudget(
      enrichTokenIntelWithGmgn(token.chainId, token.tokenAddress, intel),
      5_500,
      { intel, enrichment: null, gmgnSecurity: undefined },
    );
    intel = gmgn.intel;
    gmgnLines = gmgn.enrichment?.lines;
    gmgnSecurity = gmgn.gmgnSecurity;

    const chain = dexChainIdToGmgn(token.chainId);
    if (chain && tokenIndex < 2) {
      try {
        const sec = await withBudget(
          runGmgnAnalyticsSkill("token-security-check", { chain, address: token.tokenAddress }),
          4_500,
          null,
        );
        if (sec?.ok && sec.data) gmgnSecurity = sec.data;
      } catch {
        /* GMGN security budget exceeded */
      }
    }
  }

  return { token, intel, gmgnLines, gmgnSecurity };
}

export function candidateTags(candidate: AlphaCandidate | undefined): string[] {
  return candidate?.sourceTags ?? [];
}

export type AlphaDeskRow = {
  token: TrendingToken;
  intel: TokenIntel;
  sourceTags: string[];
  gmgnLines?: string[];
  geckoTrending: boolean;
};

export function buildAlphaDeskRowMeta(
  token: TrendingToken,
  candidateMap: Map<string, AlphaCandidate>,
  geckoHot: Set<string>,
  gmgnLines?: string[],
): AlphaDeskRow {
  const key = `${token.chainId}:${token.tokenAddress.toLowerCase()}`;
  return {
    token,
    intel: token.intel ?? buildLocalTokenIntel(token),
    sourceTags: candidateTags(candidateMap.get(key)),
    gmgnLines,
    geckoTrending: geckoHot.has(key),
  };
}
