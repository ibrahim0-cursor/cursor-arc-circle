/**
 * Live Feed universe — fresh launches & 2x–100x hunter profile (not Alpha desk).
 */

import type { TrendingToken } from "./dexscreener";
import { fetchStableMarketFeed, fetchTrendingMarketTokens } from "./dexscreener";
import {
  ensureDiscoveryFeedMin,
  dedupeFeedTokens,
  discoveryHunterLabel,
  tokenKey,
} from "./feed-curation";
import { fetchGeckoTrendingForNetwork } from "./geckoterminal";
import { FEED_DISCOVERY_GMGN_LIMIT, STABLE_FEED_LIMIT } from "./feed-config";
import { filterLiveFeedTokens } from "./token-filters";
import { fetchGmgnDiscoveryTokens } from "./gmgn-discovery";
import { hasGmgnApiKey } from "./gmgn-client";
import { filterRealGmgnMarketTokens } from "./gmgn-real-data";

export type LiveFeedProfile = "discovery-hunter";

function tagGmgnFresh(tokens: TrendingToken[]): TrendingToken[] {
  return tokens.map((t) => ({
    ...t,
    discoveryTag: t.discoveryTag ?? "GMGN fresh",
    sourceTags: [...new Set([...(t.sourceTags ?? []), "GMGN launch"])],
  }));
}

function mergeDiscoveryPools(...lists: TrendingToken[]): TrendingToken[] {
  const map = new Map<string, TrendingToken>();
  for (const t of lists) {
    const k = tokenKey(t);
    const prev = map.get(k);
    if (prev) {
      map.set(k, {
        ...prev,
        ...t,
        discoveryTag: prev.discoveryTag ?? t.discoveryTag,
        sourceTags: [...new Set([...(prev.sourceTags ?? []), ...(t.sourceTags ?? [])])],
      });
    } else {
      map.set(k, { ...t });
    }
  }
  return [...map.values()];
}

export type LiveDiscoveryOptions = {
  /** Dex-first path for /api/nexus/feed?quick=1 — avoids blocking on GMGN. */
  quick?: boolean;
};

/** Live Feed: new / pumping names with hunter scoring — separate from Alpha Scan universe. */
export async function fetchLiveDiscoveryFeed(
  limit = STABLE_FEED_LIMIT,
  options?: LiveDiscoveryOptions,
): Promise<{
  tokens: TrendingToken[];
  profile: LiveFeedProfile;
  sources: Record<string, number>;
  gmgnErrors?: string[];
  gmgnFromCache?: boolean;
  gmgnSkillsRefreshed?: string[];
}> {
  const sources: Record<string, number> = {};
  const pools: TrendingToken[] = [];

  const [dexDiscovery, dexLatest, geckoBase, geckoArb] = await Promise.all([
    fetchStableMarketFeed(limit * 2),
    fetchTrendingMarketTokens(limit, { stable: false, discovery: true }),
    fetchGeckoTrendingForNetwork("base", 1),
    fetchGeckoTrendingForNetwork("arbitrum", 1),
  ]);
  sources.dexStable = dexDiscovery.length;
  sources.dexRotate = dexLatest.length;
  sources.gecko = geckoBase.length + geckoArb.length;
  pools.push(...dexDiscovery, ...dexLatest, ...geckoBase, ...geckoArb);

  let gmgnErrors: string[] | undefined;
  let gmgnFromCache: boolean | undefined;
  let gmgnSkillsRefreshed: string[] | undefined;

  const gmgnBudgetMs = options?.quick ? 6_000 : 20_000;
  if (hasGmgnApiKey()) {
    try {
      const gmgn = await Promise.race([
        fetchGmgnDiscoveryTokens("sol", { forceFull: false }),
        new Promise<Awaited<ReturnType<typeof fetchGmgnDiscoveryTokens>>>((resolve) =>
          setTimeout(
            () => resolve({ tokens: [], sources: {}, errors: ["GMGN discovery timeout"] }),
            gmgnBudgetMs,
          ),
        ),
      ]);
      gmgnErrors = gmgn.errors;
      gmgnFromCache = gmgn.fromCache;
      gmgnSkillsRefreshed = gmgn.skillsRefreshed;
      const fresh = tagGmgnFresh(filterRealGmgnMarketTokens(gmgn.tokens)).slice(
        0,
        FEED_DISCOVERY_GMGN_LIMIT,
      );
      sources.gmgn = fresh.length;
      Object.assign(sources, gmgn.sources);
      pools.push(...fresh);
    } catch {
      sources.gmgn = 0;
      gmgnErrors = ["GMGN discovery failed"];
    }
  }

  const merged = dedupeFeedTokens(mergeDiscoveryPools(...pools));
  const curated = ensureDiscoveryFeedMin(filterLiveFeedTokens(merged), limit).map((t) => ({
    ...t,
    discoveryTag: t.discoveryTag ?? discoveryHunterLabel(t),
  }));

  return {
    tokens: curated,
    profile: "discovery-hunter",
    sources,
    gmgnErrors,
    gmgnFromCache,
    gmgnSkillsRefreshed,
  };
}
