/**
 * Unified Alpha Scan intelligence — GMGN discovery/monitor, 6551 news/X, Dex, Gecko.
 * Replaces separate GMGN skills UI; one scan button runs everything.
 */

import type { TrendingToken } from "./dexscreener";
import { filterAlphaScanTokens } from "./token-filters";
import { fetchGmgnDiscoveryTokens } from "./gmgn-discovery";
import { fetchGmgnMonitorTokens } from "./gmgn-monitor-feed";
import { hasGmgnApiKey } from "./gmgn-client";
import { hasOpenNewsToken } from "./opennews-6551";
import { hasOpenTwitterToken } from "./opentwitter-6551";
import { filterRealGmgnMarketTokens } from "./gmgn-real-data";

export type AlphaCandidate = TrendingToken & { sourceTags: string[] };

export type AlphaScanIntel = {
  layers: string[];
  marketSentiment: { label: string; score: number; summary: string; publicSummary: string };
  discoverySources: Record<string, number>;
  monitorSources: Record<string, number>;
  signalHits: number;
  errors: string[];
  gmgnActive: boolean;
  opennewsActive: boolean;
  opentwitterActive: boolean;
};

export const ALPHA_INTEL_LAYERS = [
  "GMGN discovery (5m trending, trenches, Pump.fun)",
  "GMGN signals (smart money buy, price surge, KOL call)",
  "GMGN on-chain security + smart money holders",
  "6551 OpenNews (AI-scored headlines)",
  "6551 OpenTwitter (KOL / X buzz)",
  "Community (Reddit, ApeWisdom, HN, Perception)",
  "DexScreener + GeckoTerminal liquidity",
  "Birdeye whales + TA momentum",
  "Risk + scam gate + AI thesis",
] as const;

function tokenKey(t: TrendingToken): string {
  return `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
}

function tagList(tokens: TrendingToken[], tag: string): AlphaCandidate[] {
  return tokens.map((t) => ({ ...t, sourceTags: [tag] }));
}

export function mergeAlphaCandidates(lists: AlphaCandidate[]): AlphaCandidate[] {
  const map = new Map<string, AlphaCandidate>();
  for (const t of lists) {
    const k = tokenKey(t);
    const prev = map.get(k);
    if (prev) {
      const tags = [...new Set([...prev.sourceTags, ...t.sourceTags])];
      map.set(k, { ...prev, ...t, sourceTags: tags });
    } else {
      map.set(k, { ...t });
    }
  }
  return [...map.values()];
}

export function computeMarketSentiment(opts: {
  monitorSources: Record<string, number>;
  discoverySources: Record<string, number>;
  signalHits: number;
  buyCount?: number;
  holdCount?: number;
  sellCount?: number;
}): AlphaScanIntel["marketSentiment"] {
  const smBuy = opts.monitorSources["smart-money-buy-signal"] ?? 0;
  const priceSurge = opts.monitorSources["price-surge-signal"] ?? 0;
  const kolCall = opts.monitorSources["kol-call-signal"] ?? 0;
  const smTrades = opts.monitorSources["smart-money-trades"] ?? 0;
  const trending =
    (opts.discoverySources["five-min-trending"] ?? 0) +
    (opts.discoverySources["pump-fun-trending"] ?? 0);

  let score = 0;
  score += Math.min(25, smBuy * 3);
  score += Math.min(15, priceSurge * 2);
  score += Math.min(12, kolCall * 2);
  score += Math.min(15, smTrades * 2);
  score += Math.min(10, trending);
  if ((opts.buyCount ?? 0) > (opts.sellCount ?? 0)) score += 10;
  if ((opts.sellCount ?? 0) > (opts.buyCount ?? 0) * 2) score -= 15;
  score = Math.max(-100, Math.min(100, score));

  const label =
    score >= 40 ? "Risk-on" : score >= 15 ? "Cautiously bullish" : score <= -20 ? "Risk-off" : "Neutral";

  const parts: string[] = [];
  if (smBuy > 0) parts.push(`${smBuy} smart-money buy signals`);
  if (priceSurge > 0) parts.push(`${priceSurge} price surges`);
  if (kolCall > 0) parts.push(`${kolCall} KOL calls`);
  if (smTrades > 0) parts.push(`${smTrades} smart-money live buys`);
  if (trending > 0) parts.push(`${trending} GMGN trending slots`);

  const summary =
    parts.length > 0
      ? `Market sentiment ${label} (${score}): ${parts.join(" · ")}.`
      : `Market sentiment ${label} — on-chain discovery quiet; lean on per-token intel.`;

  const publicSummary =
    label === "Risk-on"
      ? `Risk appetite elevated (index ${score}).`
      : label === "Cautiously bullish"
        ? `Cautiously positive tone (index ${score}).`
        : label === "Risk-off"
          ? `Defensive market tone (index ${score}).`
          : `Neutral cross-currents (index ${score}).`;

  return { label, score, summary, publicSummary };
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Prefetch GMGN universe + signal index for Alpha Scan. */
export async function buildAlphaScanUniverse(
  dexFeed: TrendingToken[],
  geckoFeed: TrendingToken[],
): Promise<{ candidates: AlphaCandidate[]; intel: AlphaScanIntel }> {
  const errors: string[] = [];
  const emptyDiscovery = { tokens: [] as TrendingToken[], sources: {}, errors: [] as string[] };
  const emptyMonitor = { tokens: [] as TrendingToken[], sources: {}, errors: [] as string[] };

  const gmgnDiscovery = await withTimeout(
    fetchGmgnDiscoveryTokens("sol", { forceFull: true }).catch((e) => {
      errors.push(e instanceof Error ? e.message : "discovery feed unavailable");
      return emptyDiscovery;
    }),
    45_000,
    emptyDiscovery,
  );
  const gmgnMonitor = await withTimeout(
    fetchGmgnMonitorTokens("sol", { forceFull: true }).catch((e) => {
      errors.push(e instanceof Error ? e.message : "signal feed unavailable");
      return emptyMonitor;
    }),
    45_000,
    emptyMonitor,
  );

  errors.push(...gmgnDiscovery.errors, ...gmgnMonitor.errors);

  const signalHits = gmgnMonitor.sources["smart-money-buy-signal"] ?? 0;

  const lists: AlphaCandidate[] = [
    ...tagList(filterRealGmgnMarketTokens(gmgnMonitor.tokens), "GMGN signal"),
    ...tagList(filterRealGmgnMarketTokens(gmgnDiscovery.tokens), "GMGN trending"),
    ...tagList(filterAlphaScanTokens(dexFeed), "DexScreener"),
    ...tagList(filterAlphaScanTokens(geckoFeed), "GeckoTerminal"),
  ];

  const intel: AlphaScanIntel = {
    layers: [...ALPHA_INTEL_LAYERS],
    discoverySources: gmgnDiscovery.sources,
    monitorSources: gmgnMonitor.sources,
    signalHits,
    errors,
    gmgnActive: hasGmgnApiKey(),
    opennewsActive: hasOpenNewsToken(),
    opentwitterActive: hasOpenTwitterToken(),
    marketSentiment: computeMarketSentiment({
      monitorSources: gmgnMonitor.sources,
      discoverySources: gmgnDiscovery.sources,
      signalHits,
    }),
  };

  return { candidates: filterAlphaScanTokens(mergeAlphaCandidates(lists)), intel };
}

export function sourceTagsForToken(
  candidate: AlphaCandidate | undefined,
  gmgnLines?: string[],
): string[] {
  const tags = [...(candidate?.sourceTags ?? [])];
  if (gmgnLines?.length) tags.push("GMGN intel");
  return [...new Set(tags)].slice(0, 6);
}

export function gmgnSignalLine(tags: string[]): string | undefined {
  const signal = tags.filter((t) => t.includes("signal") || t.includes("GMGN"));
  if (signal.length === 0) return undefined;
  return `Sources: ${signal.join(", ")}`;
}
