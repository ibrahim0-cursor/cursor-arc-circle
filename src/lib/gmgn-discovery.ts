/**
 * GMGN Data Analytics discovery — merges CLI-equivalent OpenAPI reads into NEXUS feeds.
 */

import type { TrendingToken } from "./dexscreener";
import { filterAlphaScanTokens } from "./token-filters";
import {
  gmgnFiveMinTrending,
  gmgnKolBoughtNew,
  gmgnNearGraduation,
  gmgnNewlyCreated,
  gmgnPumpFunTrending,
  runGmgnAnalyticsSkill,
  type GmgnAnalyticsSkillId,
} from "./gmgn-analytics";
import { hasGmgnApiKey, type GmgnChain, type GmgnTrendingToken } from "./gmgn-client";
import {
  getGmgnBanStatus,
  gmgnCacheKey,
  readGmgnCache,
  writeGmgnCache,
} from "./gmgn-rate-budget";
import { filterRealGmgnMarketTokens } from "./gmgn-real-data";
import { GMGN_DISCOVERY_SKILLS_PER_REFRESH } from "./feed-config";

export function gmgnChainToDexChainId(chain: GmgnChain): string {
  const map: Record<GmgnChain, string> = {
    sol: "solana",
    bsc: "bsc",
    base: "base",
    eth: "ethereum",
  };
  return map[chain] ?? chain;
}

function gmgnUrl(chain: GmgnChain, address: string): string {
  const slug = chain === "sol" ? "sol" : chain;
  return `https://gmgn.ai/${slug}/token/${address}`;
}

export function gmgnTrendingRowToToken(row: GmgnTrendingToken): TrendingToken {
  const chainId = gmgnChainToDexChainId(row.chain);
  return {
    symbol: row.symbol,
    name: row.name,
    tokenAddress: row.address,
    chainId,
    pairAddress: row.address,
    priceUsd: row.priceUsd,
    change24h: row.change24h,
    volume24h: row.volume24h,
    liquidityUsd: row.liquidityUsd,
    marketCap: row.marketCap,
    icon: row.logo,
    url: gmgnUrl(row.chain, row.address),
    intel: undefined,
  };
}

type TrenchesRow = {
  address?: string;
  symbol?: string;
  name?: string;
  chain?: string;
  price?: number;
  market_cap?: number;
  liquidity?: number;
  volume?: number;
};

function trenchesRows(data: unknown): TrenchesRow[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const list = d.list ?? d.tokens ?? d.rank ?? d.data;
  return Array.isArray(list) ? (list as TrenchesRow[]) : [];
}

function trenchesRowToToken(row: TrenchesRow, chain: GmgnChain): TrendingToken | null {
  const address = row.address?.trim();
  const symbol = row.symbol?.trim();
  if (!address || !symbol) return null;
  const c = (String(row.chain ?? chain) as GmgnChain) || chain;
  return {
    symbol,
    name: String(row.name ?? symbol),
    tokenAddress: address,
    chainId: gmgnChainToDexChainId(c),
    pairAddress: address,
    priceUsd: Number(row.price ?? 0),
    change24h: 0,
    volume24h: Number(row.volume ?? 0),
    liquidityUsd: Number(row.liquidity ?? 0),
    marketCap: Number(row.market_cap ?? 0),
    url: gmgnUrl(c, address),
  };
}

function dedupeTokens(tokens: TrendingToken[]): TrendingToken[] {
  const seen = new Set<string>();
  const out: TrendingToken[] = [];
  for (const t of tokens) {
    const key = `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export type GmgnDiscoveryBundle = {
  tokens: TrendingToken[];
  sources: Record<string, number>;
  errors: string[];
  fromCache?: boolean;
  skillsRefreshed?: string[];
};

type DiscoverySkillId =
  | "five-min-trending"
  | "pump-fun-trending"
  | "newly-created-tokens"
  | "kol-bought-new"
  | "near-graduation";

const DISCOVERY_ROTATE: DiscoverySkillId[] = [
  "five-min-trending",
  "pump-fun-trending",
  "newly-created-tokens",
  "kol-bought-new",
  "near-graduation",
];

let discoveryRotateIdx = 0;

type SkillSlice = { tokens: TrendingToken[]; count: number; error?: string };

function mergeSkillSlices(
  slices: Partial<Record<DiscoverySkillId, SkillSlice>>,
): { tokens: TrendingToken[]; sources: Record<string, number>; errors: string[] } {
  const tokens: TrendingToken[] = [];
  const sources: Record<string, number> = {};
  const errors: string[] = [];
  for (const id of DISCOVERY_ROTATE) {
    const slice = slices[id];
    if (!slice) continue;
    if (slice.error) errors.push(`${id}: ${slice.error}`);
    sources[id] = slice.count;
    tokens.push(...slice.tokens);
  }
  return {
    tokens: filterAlphaScanTokens(filterRealGmgnMarketTokens(dedupeTokens(tokens))),
    sources,
    errors,
  };
}

function parseTrendingSkill(
  chain: GmgnChain,
  res: { ok: boolean; data?: unknown; error?: string },
): SkillSlice {
  if (!res.ok) return { tokens: [], count: 0, error: res.error };
  const data = res.data as { tokens?: GmgnTrendingToken[]; rank?: unknown[] } | undefined;
  let rows: GmgnTrendingToken[] = [];
  if (Array.isArray(data?.tokens)) rows = data.tokens;
  else if (Array.isArray(data?.rank)) {
    rows = (data.rank as Record<string, unknown>[]).map((r) => ({
      address: String(r.address ?? ""),
      symbol: String(r.symbol ?? ""),
      name: String(r.name ?? r.symbol ?? ""),
      chain,
      priceUsd: Number(r.price ?? 0),
      change24h: Number(r.price_change_percent1h ?? r.price_change_percent ?? 0),
      volume24h: Number(r.volume ?? 0),
      liquidityUsd: Number(r.liquidity ?? 0),
      marketCap: Number(r.market_cap ?? 0),
      logo: r.logo ? String(r.logo) : undefined,
    }));
  }
  const mapped = filterRealGmgnMarketTokens(
    rows.filter((r) => r.address && r.symbol).map(gmgnTrendingRowToToken),
  );
  return { tokens: mapped, count: mapped.length };
}

function parseTrenchesSkill(
  chain: GmgnChain,
  res: { ok: boolean; data?: unknown; error?: string },
): SkillSlice {
  if (!res.ok) return { tokens: [], count: 0, error: res.error };
  const mapped = filterRealGmgnMarketTokens(
    trenchesRows(res.data)
      .map((r) => trenchesRowToToken(r, chain))
      .filter((t): t is TrendingToken => t != null),
  );
  return { tokens: mapped, count: mapped.length };
}

async function runDiscoverySkill(
  chain: GmgnChain,
  id: DiscoverySkillId,
): Promise<SkillSlice> {
  switch (id) {
    case "five-min-trending":
      return parseTrendingSkill(chain, await gmgnFiveMinTrending(chain, 25));
    case "pump-fun-trending":
      return parseTrendingSkill(chain, await gmgnPumpFunTrending(chain, "1h", 20));
    case "newly-created-tokens":
      return parseTrenchesSkill(chain, await gmgnNewlyCreated(chain, 30));
    case "kol-bought-new":
      return parseTrenchesSkill(chain, await gmgnKolBoughtNew(chain, 25));
    case "near-graduation":
      return parseTrenchesSkill(chain, await gmgnNearGraduation(chain, 25));
  }
}

export type FetchGmgnDiscoveryOptions = {
  /** Alpha Scan: run all 5 discovery skills once (sequential). Live Feed: 2 skills per refresh. */
  forceFull?: boolean;
};

/** Discovery skills — incremental on feed, full on Alpha; cached reads when rate-limited. */
export async function fetchGmgnDiscoveryTokens(
  chain: GmgnChain = "sol",
  opts: FetchGmgnDiscoveryOptions = {},
): Promise<GmgnDiscoveryBundle> {
  if (!hasGmgnApiKey()) {
    return { tokens: [], sources: {}, errors: ["GMGN_API_KEY not set"] };
  }

  const bundleKey = gmgnCacheKey("discovery-bundle", { chain });
  const sliceKey = gmgnCacheKey("discovery-slices", { chain });
  const cached = readGmgnCache<GmgnDiscoveryBundle>(bundleKey);
  const slices = readGmgnCache<Partial<Record<DiscoverySkillId, SkillSlice>>>(sliceKey) ?? {};

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

  const perRefresh = Math.max(1, Math.min(5, GMGN_DISCOVERY_SKILLS_PER_REFRESH));
  const forceFull = opts.forceFull === true || Object.keys(slices).length < 2;

  const toRun: DiscoverySkillId[] = forceFull
    ? [...DISCOVERY_ROTATE]
    : Array.from({ length: perRefresh }, (_, i) => {
        const idx = (discoveryRotateIdx + i) % DISCOVERY_ROTATE.length;
        return DISCOVERY_ROTATE[idx]!;
      });

  if (!forceFull) discoveryRotateIdx = (discoveryRotateIdx + perRefresh) % DISCOVERY_ROTATE.length;

  const refreshed: string[] = [];
  for (const id of toRun) {
    const slice = await runDiscoverySkill(chain, id);
    slices[id] = slice;
    refreshed.push(id);
    if (slice.error?.includes("BANNED") || slice.error?.includes("RATE_LIMIT")) break;
  }

  writeGmgnCache(sliceKey, slices);
  const merged = mergeSkillSlices(slices);
  const bundle: GmgnDiscoveryBundle = {
    ...merged,
    fromCache: false,
    skillsRefreshed: refreshed,
  };
  writeGmgnCache(bundleKey, bundle);
  return bundle;
}

export const GMGN_DATA_ANALYTICS_SKILLS: GmgnAnalyticsSkillId[] = [
  "five-min-trending",
  "token-overview",
  "token-security-check",
  "token-kline",
  "liquidity-pool",
  "top-holders",
  "smart-money-holders",
  "kol-holders",
  "newly-created-tokens",
  "kol-bought-new",
  "near-graduation",
  "pump-fun-trending",
];

function gmgnLightStatusProbe(): boolean {
  return (
    process.env.GMGN_STATUS_FULL_PROBE?.trim().toLowerCase() !== "true" &&
    process.env.GMGN_LIGHT_STATUS_PROBE?.trim().toLowerCase() !== "false"
  );
}

/** Status probe — light mode uses cache / one skill; full mode runs discovery skills sequentially. */
export async function probeGmgnAnalyticsSkills(chain: GmgnChain = "sol"): Promise<{
  ok: boolean;
  skills: Record<string, { ok: boolean; error?: string; note?: string }>;
}> {
  if (!hasGmgnApiKey()) {
    return { ok: false, skills: {} };
  }

  if (gmgnLightStatusProbe()) {
    const bundleKey = gmgnCacheKey("discovery-bundle", { chain });
    const cached = readGmgnCache<GmgnDiscoveryBundle>(bundleKey);
    if (cached && cached.tokens.length > 0) {
      return {
        ok: true,
        skills: {
          "discovery-bundle": {
            ok: true,
            note: `cached ${cached.tokens.length} tokens — all 5 discovery skills`,
          },
        },
      };
    }
    const r = await runGmgnAnalyticsSkill("five-min-trending", { chain, limit: 2 });
    return {
      ok: r.ok,
      skills: {
        "five-min-trending": { ok: r.ok, error: r.error },
        _mode: { ok: true, note: "light status probe (set GMGN_STATUS_FULL_PROBE=true for all skills)" },
      },
    };
  }

  const probes: { id: GmgnAnalyticsSkillId; params: Parameters<typeof runGmgnAnalyticsSkill>[1] }[] = [
    { id: "five-min-trending", params: { chain, limit: 3 } },
    { id: "pump-fun-trending", params: { chain, limit: 3 } },
    { id: "newly-created-tokens", params: { chain, limit: 5 } },
    { id: "kol-bought-new", params: { chain, limit: 5 } },
    { id: "near-graduation", params: { chain, limit: 5 } },
  ];

  const skills: Record<string, { ok: boolean; error?: string }> = {};
  for (const { id, params } of probes) {
    const r = await runGmgnAnalyticsSkill(id, params);
    skills[id] = { ok: r.ok, error: r.error };
    if (r.error?.includes("BANNED") || r.error?.includes("RATE_LIMIT")) break;
  }

  const okCount = Object.values(skills).filter((s) => s.ok).length;
  return { ok: okCount >= 2, skills };
}
