/**
 * GMGN market rank → Alpha scan narrative boost (read-only).
 */

import { fetchGmgnDiscoveryTokens } from "./gmgn-discovery";
import { fetchGmgnMarketRank, hasGmgnApiKey, type GmgnTrendingToken } from "./gmgn-client";

export type GmgnAlphaContext = {
  bySymbol: Map<string, GmgnTrendingToken>;
  topSymbols: string[];
};

let contextCache: { at: number; ctx: GmgnAlphaContext } | null = null;
const CACHE_MS = 3 * 60 * 1000;

export async function getGmgnAlphaContext(force = false): Promise<GmgnAlphaContext | null> {
  if (!hasGmgnApiKey()) return null;
  if (!force && contextCache && Date.now() - contextCache.at < CACHE_MS) {
    return contextCache.ctx;
  }

  const discovery = await fetchGmgnDiscoveryTokens("sol", { forceFull: false });
  const bySymbol = new Map<string, GmgnTrendingToken>();

  for (const t of discovery.tokens) {
    if (t.priceUsd <= 0 && t.volume24h <= 0) continue;
    const sym = t.symbol.toUpperCase();
    const row: GmgnTrendingToken = {
      address: t.tokenAddress,
      symbol: t.symbol,
      name: t.name,
      chain: "sol",
      priceUsd: t.priceUsd,
      change24h: t.change24h,
      volume24h: t.volume24h,
      liquidityUsd: t.liquidityUsd,
      marketCap: t.marketCap,
      logo: t.icon,
    };
    if (!bySymbol.has(sym) || row.volume24h > (bySymbol.get(sym)?.volume24h ?? 0)) {
      bySymbol.set(sym, row);
    }
  }

  if (bySymbol.size < 5) {
    const sol = await fetchGmgnMarketRank("sol", "5m", 15);
    for (const row of sol) {
      const sym = row.symbol.toUpperCase();
      if (!bySymbol.has(sym) || row.volume24h > (bySymbol.get(sym)?.volume24h ?? 0)) {
        bySymbol.set(sym, row);
      }
    }
  }

  const ctx: GmgnAlphaContext = {
    bySymbol,
    topSymbols: [...bySymbol.values()]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 20)
      .map((t) => t.symbol),
  };

  contextCache = { at: Date.now(), ctx };
  return ctx;
}

export function gmgnBoostForSymbol(symbol: string, ctx: GmgnAlphaContext | null): {
  boost: number;
  line?: string;
} {
  if (!ctx) return { boost: 0 };
  const row = ctx.bySymbol.get(symbol.replace(/^\$/, "").trim().toUpperCase());
  if (!row) return { boost: 0 };
  const boost = Math.min(15, 6 + Math.min(9, Math.floor(row.volume24h / 50_000)));
  return {
    boost,
    line: `GMGN trending (${row.chain}) · vol $${Math.round(row.volume24h).toLocaleString()} · ${row.change24h.toFixed(1)}% 1h`,
  };
}
