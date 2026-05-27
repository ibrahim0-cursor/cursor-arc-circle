/**
 * GMGN Data Analytics discovery — merges CLI-equivalent OpenAPI reads into NEXUS feeds.
 */

import type { TrendingToken } from "./dexscreener";
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

/** Run all market-discovery analytics skills (parallel). */
export async function fetchGmgnDiscoveryTokens(chain: GmgnChain = "sol"): Promise<{
  tokens: TrendingToken[];
  sources: Record<string, number>;
  errors: string[];
}> {
  if (!hasGmgnApiKey()) {
    return { tokens: [], sources: {}, errors: ["GMGN_API_KEY not set"] };
  }

  const [fiveMin, pumpFun, newly, kolBought, nearGrad] = await Promise.all([
    gmgnFiveMinTrending(chain, 25),
    gmgnPumpFunTrending(chain, "1h", 20),
    gmgnNewlyCreated(chain, 30),
    gmgnKolBoughtNew(chain, 25),
    gmgnNearGraduation(chain, 25),
  ]);

  const errors: string[] = [];
  const tokens: TrendingToken[] = [];
  const sources: Record<string, number> = {};

  const addTrending = (label: string, res: { ok: boolean; data?: unknown; error?: string }) => {
    if (!res.ok) {
      if (res.error) errors.push(`${label}: ${res.error}`);
      return;
    }
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
    const mapped = rows.filter((r) => r.address && r.symbol).map(gmgnTrendingRowToToken);
    sources[label] = mapped.length;
    tokens.push(...mapped);
  };

  const addTrenches = (label: string, res: { ok: boolean; data?: unknown; error?: string }) => {
    if (!res.ok) {
      if (res.error) errors.push(`${label}: ${res.error}`);
      return;
    }
    const mapped = trenchesRows(res.data)
      .map((r) => trenchesRowToToken(r, chain))
      .filter((t): t is TrendingToken => t != null);
    sources[label] = mapped.length;
    tokens.push(...mapped);
  };

  addTrending("five-min-trending", fiveMin);
  addTrending("pump-fun-trending", pumpFun);
  addTrenches("newly-created-tokens", newly);
  addTrenches("kol-bought-new", kolBought);
  addTrenches("near-graduation", nearGrad);

  return { tokens: dedupeTokens(tokens), sources, errors };
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

/** Probe each analytics skill (lightweight). */
export async function probeGmgnAnalyticsSkills(chain: GmgnChain = "sol"): Promise<{
  ok: boolean;
  skills: Record<string, { ok: boolean; error?: string }>;
}> {
  if (!hasGmgnApiKey()) {
    return { ok: false, skills: {} };
  }

  const probes: { id: GmgnAnalyticsSkillId; params: Parameters<typeof runGmgnAnalyticsSkill>[1] }[] = [
    { id: "five-min-trending", params: { chain, limit: 3 } },
    { id: "pump-fun-trending", params: { chain, limit: 3 } },
    { id: "newly-created-tokens", params: { chain, limit: 5 } },
    { id: "kol-bought-new", params: { chain, limit: 5 } },
    { id: "near-graduation", params: { chain, limit: 5 } },
  ];

  const skills: Record<string, { ok: boolean; error?: string }> = {};
  await Promise.all(
    probes.map(async ({ id, params }) => {
      const r = await runGmgnAnalyticsSkill(id, params);
      skills[id] = { ok: r.ok, error: r.error };
    }),
  );

  const okCount = Object.values(skills).filter((s) => s.ok).length;
  return { ok: okCount >= 2, skills };
}
