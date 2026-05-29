/**
 * Merge GMGN monitor signals + trades into NEXUS Alpha token feed.
 */

import type { TrendingToken } from "./dexscreener";
import { fetchTokenByAddress } from "./dexscreener";
import { filterAlphaScanTokens } from "./token-filters";
import { gmgnChainToDexChainId } from "./gmgn-discovery";
import {
  parseSignalEvents,
  runGmgnMonitorSkill,
  type GmgnMonitorSkillId,
} from "./gmgn-monitor";
import { hasGmgnApiKey, type GmgnChain } from "./gmgn-client";
import {
  getGmgnBanStatus,
  gmgnCacheKey,
  readGmgnCache,
  writeGmgnCache,
} from "./gmgn-rate-budget";
import { filterRealGmgnMarketTokens, hasGmgnIdentity, hasRealGmgnMarketFields } from "./gmgn-real-data";
import { GMGN_MONITOR_SKILLS_PER_REFRESH } from "./feed-config";
import { mapWithConcurrency } from "./async-pool";

function signalToToken(chain: GmgnChain, ev: { tokenAddress: string; symbol?: string }): TrendingToken {
  const chainId = gmgnChainToDexChainId(chain);
  const sym = ev.symbol ?? ev.tokenAddress.slice(0, 6);
  return {
    symbol: sym,
    name: sym,
    tokenAddress: ev.tokenAddress,
    chainId,
    pairAddress: ev.tokenAddress,
    priceUsd: 0,
    change24h: 0,
    volume24h: 0,
    liquidityUsd: 0,
    url: `https://gmgn.ai/${chain === "sol" ? "sol" : chain}/token/${ev.tokenAddress}`,
    sourceTags: ["GMGN signal"],
  };
}

function tradesToTokens(chain: GmgnChain, data: unknown): TrendingToken[] {
  const list =
    data && typeof data === "object" && Array.isArray((data as { list?: unknown[] }).list)
      ? ((data as { list: Record<string, unknown>[] }).list ?? [])
      : [];
  const out: TrendingToken[] = [];
  for (const row of list) {
    const addr = String(row.base_address ?? "").trim();
    if (!addr) continue;
    const sym = String((row.base_token as { symbol?: string })?.symbol ?? addr.slice(0, 6));
    out.push({
      symbol: sym,
      name: String((row.base_token as { name?: string })?.name ?? sym),
      tokenAddress: addr,
      chainId: gmgnChainToDexChainId(chain),
      pairAddress: addr,
      priceUsd: Number(row.price_usd ?? 0),
      change24h: 0,
      volume24h: Number(row.amount_usd ?? 0),
      liquidityUsd: 0,
      url: `https://gmgn.ai/${chain === "sol" ? "sol" : chain}/token/${addr}`,
      sourceTags: ["GMGN smart-money trade"],
    });
  }
  return filterRealGmgnMarketTokens(out);
}

function dedupe(tokens: TrendingToken[]): TrendingToken[] {
  const seen = new Set<string>();
  const out: TrendingToken[] = [];
  for (const t of tokens) {
    const k = `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

const MONITOR_ROTATE: GmgnMonitorSkillId[] = [
  "smart-money-buy-signal",
  "price-surge-signal",
  "kol-call-signal",
  "smart-money-trades",
  "kol-trade-activity",
];

let monitorRotateIdx = 0;

type MonitorSlice = { tokens: TrendingToken[]; count: number; error?: string };

function applyMonitorResult(
  chain: GmgnChain,
  skill: GmgnMonitorSkillId,
  res: Awaited<ReturnType<typeof runGmgnMonitorSkill>>,
): MonitorSlice {
  if (!res.ok) return { tokens: [], count: 0, error: res.error };
  if (skill.endsWith("-signal")) {
    const mapped = parseSignalEvents(res.data)
      .map((e) => signalToToken(chain, e))
      .filter(hasGmgnIdentity);
    return { tokens: mapped, count: mapped.length };
  }
  const mapped = tradesToTokens(chain, res.data);
  return { tokens: mapped, count: mapped.length };
}

export type FetchGmgnMonitorOptions = { forceFull?: boolean };

export type GmgnMonitorBundle = {
  tokens: TrendingToken[];
  sources: Record<string, number>;
  errors: string[];
  fromCache?: boolean;
  skillsRefreshed?: string[];
};

/** Enrich signal-only rows with Dex prices (real reads, not $0 placeholders). */
export async function enrichGmgnSignalsWithDex(
  tokens: TrendingToken[],
  cap = 10,
): Promise<TrendingToken[]> {
  const need = tokens
    .filter((t) => hasGmgnIdentity(t) && !hasRealGmgnMarketFields(t))
    .slice(0, cap);
  if (need.length === 0) return tokens;

  const resolved = await mapWithConcurrency(
    need,
    async (t) => {
      const pair = await fetchTokenByAddress(t.chainId, t.tokenAddress);
      if (!pair || pair.priceUsd <= 0) return t;
      return {
        ...t,
        ...pair,
        sourceTags: [...new Set([...(t.sourceTags ?? []), ...(pair.sourceTags ?? []), "Dex price"])],
      };
    },
    3,
  );

  const byKey = new Map(resolved.map((t) => [`${t.chainId}:${t.tokenAddress.toLowerCase()}`, t]));
  return tokens.map((t) => byKey.get(`${t.chainId}:${t.tokenAddress.toLowerCase()}`) ?? t);
}

export async function fetchGmgnMonitorTokens(
  chain: GmgnChain = "sol",
  opts: FetchGmgnMonitorOptions = {},
): Promise<GmgnMonitorBundle> {
  if (!hasGmgnApiKey()) {
    return { tokens: [], sources: {}, errors: ["GMGN_API_KEY not set"] };
  }

  const bundleKey = gmgnCacheKey("monitor-bundle", { chain });
  const sliceKey = gmgnCacheKey("monitor-slices", { chain });
  const cached = readGmgnCache<GmgnMonitorBundle>(bundleKey);
  const slices = readGmgnCache<Partial<Record<GmgnMonitorSkillId, MonitorSlice>>>(sliceKey) ?? {};

  const ban = getGmgnBanStatus();
  if (ban.banned) {
    if (cached?.tokens.length) {
      return {
        ...cached,
        fromCache: true,
        errors: [...(cached.errors ?? []), "GMGN cooldown — showing last real cached reads"],
      };
    }
    return { tokens: [], sources: {}, errors: ["GMGN_RATE_LIMIT_BANNED"] };
  }

  const perRefresh = Math.max(1, Math.min(5, GMGN_MONITOR_SKILLS_PER_REFRESH));
  const forceFull = opts.forceFull === true || Object.keys(slices).length < 2;

  const toRun: GmgnMonitorSkillId[] = forceFull
    ? [...MONITOR_ROTATE]
    : Array.from({ length: perRefresh }, (_, i) => {
        const idx = (monitorRotateIdx + i) % MONITOR_ROTATE.length;
        return MONITOR_ROTATE[idx]!;
      });

  if (!forceFull) monitorRotateIdx = (monitorRotateIdx + perRefresh) % MONITOR_ROTATE.length;

  const refreshed: string[] = [];
  for (const skill of toRun) {
    const res = await runGmgnMonitorSkill(skill, {
      chain,
      limit: skill.includes("signal") ? undefined : 25,
      side: skill === "smart-money-trades" || skill === "kol-trade-activity" ? "buy" : undefined,
    });
    slices[skill] = applyMonitorResult(chain, skill, res);
    refreshed.push(skill);
    if (res.error?.includes("BANNED") || res.error?.includes("RATE_LIMIT")) break;
  }

  writeGmgnCache(sliceKey, slices);

  const tokens: TrendingToken[] = [];
  const sources: Record<string, number> = {};
  const errors: string[] = [];
  for (const skill of MONITOR_ROTATE) {
    const slice = slices[skill];
    if (!slice) continue;
    if (slice.error) errors.push(`${skill}: ${slice.error}`);
    sources[skill] = slice.count;
    tokens.push(...slice.tokens);
  }

  let merged = filterAlphaScanTokens(dedupe(tokens));
  merged = await enrichGmgnSignalsWithDex(merged, 12);

  const bundle: GmgnMonitorBundle = {
    tokens: merged.filter((t) => hasGmgnIdentity(t) && hasRealGmgnMarketFields(t)),
    sources,
    errors,
    fromCache: false,
    skillsRefreshed: refreshed,
  };
  writeGmgnCache(bundleKey, bundle);
  return bundle;
}
