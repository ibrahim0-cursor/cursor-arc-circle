/**
 * Live Feed universe — fresh launches & 2x–100x hunter profile (not Alpha desk).
 */

import type { TrendingToken } from "./dexscreener";
import { fetchStableMarketFeed, fetchTrendingMarketTokens } from "./dexscreener";
import { curateDiscoveryFeed, discoveryHunterLabel, tokenKey } from "./feed-curation";
import { FEED_DISCOVERY_GMGN_LIMIT, STABLE_FEED_LIMIT } from "./feed-config";
import { filterLiveFeedTokens } from "./token-filters";
import { fetchGmgnDiscoveryTokens } from "./gmgn-discovery";
import { hasGmgnApiKey } from "./gmgn-client";

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

/** Live Feed: new / pumping names with hunter scoring — separate from Alpha Scan universe. */
export async function fetchLiveDiscoveryFeed(limit = STABLE_FEED_LIMIT): Promise<{
  tokens: TrendingToken[];
  profile: LiveFeedProfile;
  sources: Record<string, number>;
}> {
  const sources: Record<string, number> = {};
  const pools: TrendingToken[] = [];

  const [dexDiscovery, dexLatest] = await Promise.all([
    fetchStableMarketFeed(limit * 2),
    fetchTrendingMarketTokens(limit, { stable: false, discovery: true }),
  ]);
  sources.dexStable = dexDiscovery.length;
  sources.dexRotate = dexLatest.length;
  pools.push(...dexDiscovery, ...dexLatest);

  if (hasGmgnApiKey()) {
    try {
      const gmgn = await Promise.race([
        fetchGmgnDiscoveryTokens("sol"),
        new Promise<{ tokens: TrendingToken[]; sources: Record<string, number> }>((resolve) =>
          setTimeout(() => resolve({ tokens: [], sources: {} }), 14_000),
        ),
      ]);
      const fresh = tagGmgnFresh(gmgn.tokens).slice(0, FEED_DISCOVERY_GMGN_LIMIT);
      sources.gmgn = fresh.length;
      Object.assign(sources, gmgn.sources);
      pools.push(...fresh);
    } catch {
      sources.gmgn = 0;
    }
  }

  const merged = mergeDiscoveryPools(...pools);
  const curated = curateDiscoveryFeed(filterLiveFeedTokens(merged), limit).map((t) => ({
    ...t,
    discoveryTag: t.discoveryTag ?? discoveryHunterLabel(t),
  }));

  return { tokens: curated, profile: "discovery-hunter", sources };
}
