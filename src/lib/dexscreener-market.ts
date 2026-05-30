/**
 * DexScreener v1 market structure — price, volume, liquidity, txns, flow skew.
 * Free tier: token-pairs 300/min, profiles/boosts 60/min.
 */

import type { TrendingToken } from "./dexscreener";

export type DexFlowSkew = {
  buys: number;
  sells: number;
  ratio: number;
  label: string;
  impact: "bullish" | "bearish" | "neutral";
};

export type DexMarketMetrics = {
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCap?: number;
  fdv?: number;
  flow: DexFlowSkew;
  pairAgeHours?: number;
  turnover: number;
  buySellImbalancePct: number;
};

export function computeFlowSkew(
  buys: number,
  sells: number,
): DexFlowSkew {
  const b = Math.max(0, buys);
  const s = Math.max(1, sells);
  const ratio = b / s;
  const imbalance = ratio > 1 ? (ratio - 1) * 100 : (1 - ratio) * 100;
  let impact: DexFlowSkew["impact"] = "neutral";
  if (ratio >= 1.2) impact = "bullish";
  else if (ratio <= 0.82) impact = "bearish";
  const label =
    ratio >= 1.2
      ? `Buy-heavy flow (${imbalance.toFixed(0)}% more buys than sells, 24h txns)`
      : ratio <= 0.82
        ? `Sell-heavy flow (${imbalance.toFixed(0)}% more sells than buys, 24h txns)`
        : `Balanced flow (${b} buys / ${s} sells)`;
  return { buys: b, sells: s, ratio, label, impact };
}

export function pairAgeHoursFromCreatedAt(pairCreatedAt?: number | null): number | undefined {
  if (!pairCreatedAt || pairCreatedAt <= 0) return undefined;
  const ms = pairCreatedAt > 1e12 ? pairCreatedAt : pairCreatedAt * 1000;
  const ageH = (Date.now() - ms) / 3_600_000;
  return ageH > 0 && ageH < 8760 * 3 ? ageH : undefined;
}

export function computeDexMarketMetrics(token: TrendingToken): DexMarketMetrics {
  const buys = token.txns24h?.buys ?? 0;
  const sells = token.txns24h?.sells ?? 0;
  const flow = computeFlowSkew(buys, sells);
  const liq = token.liquidityUsd ?? 0;
  const vol = token.volume24h ?? 0;
  return {
    priceUsd: token.priceUsd,
    change24h: token.change24h ?? 0,
    volume24h: vol,
    liquidityUsd: liq,
    marketCap: token.marketCap,
    fdv: token.fdv,
    flow,
    pairAgeHours: token.pairAgeHours,
    turnover: liq > 0 ? vol / liq : 0,
    buySellImbalancePct:
      flow.ratio > 1 ? (flow.ratio - 1) * 100 : flow.ratio < 1 ? (1 - flow.ratio) * 100 : 0,
  };
}

export type DexProfileRow = {
  chainId: string;
  tokenAddress: string;
  url?: string;
  icon?: string;
  description?: string;
};

/** Latest token profiles — 60 req/min */
export async function fetchDexLatestProfiles(): Promise<DexProfileRow[]> {
  try {
    const res = await fetch("https://api.dexscreener.com/token-profiles/latest/v1", {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows = Array.isArray(json) ? json : [json];
    return rows
      .map((r: Record<string, unknown>) => ({
        chainId: String(r.chainId ?? ""),
        tokenAddress: String(r.tokenAddress ?? ""),
        url: r.url ? String(r.url) : undefined,
        icon: r.icon ? String(r.icon) : undefined,
        description: r.description ? String(r.description) : undefined,
      }))
      .filter((r) => r.chainId && r.tokenAddress);
  } catch {
    return [];
  }
}

/** Batch token pairs via tokens/v1 (up to 30 comma-separated addresses per chain). */
export async function fetchDexTokensBatch(
  chainId: string,
  addresses: string[],
): Promise<Map<string, TrendingToken>> {
  const out = new Map<string, TrendingToken>();
  const uniq = [...new Set(addresses.map((a) => a.toLowerCase()))].slice(0, 30);
  if (!uniq.length) return out;

  const { mapPairFromDexPair } = await import("./dexscreener");

  for (let i = 0; i < uniq.length; i += 30) {
    const chunk = uniq.slice(i, i + 30);
    try {
      const res = await fetch(
        `https://api.dexscreener.com/tokens/v1/${chainId}/${chunk.join(",")}`,
        { next: { revalidate: 30 } },
      );
      if (!res.ok) continue;
      const pairs = (await res.json()) as Array<Parameters<typeof mapPairFromDexPair>[0]>;
      if (!Array.isArray(pairs)) continue;
      for (const addr of chunk) {
        const forToken = pairs.filter(
          (p) => p.baseToken?.address?.toLowerCase() === addr,
        );
        if (!forToken.length) continue;
        const best = [...forToken].sort(
          (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
        )[0];
        const mapped = mapPairFromDexPair(best);
        if (mapped.priceUsd > 0) out.set(addr, mapped);
      }
    } catch {
      /* skip chunk */
    }
  }
  return out;
}
