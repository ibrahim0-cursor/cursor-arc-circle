/** DefiLlama public TVL API — no key for /v2/chains and historicalChainTvl. */

const BASE = "https://api.llama.fi";

export type DefiLlamaOverview = {
  totalTvlUsd: number;
  change7dPct: number | null;
  topChains: Array<{ name: string; tvl: number }>;
};

export async function fetchDefiLlamaOverview(): Promise<DefiLlamaOverview | null> {
  try {
    const [chainsRes, histRes] = await Promise.all([
      fetch(`${BASE}/v2/chains`, {
        signal: AbortSignal.timeout(10_000),
        next: { revalidate: 600 },
      }),
      fetch(`${BASE}/v2/historicalChainTvl`, {
        signal: AbortSignal.timeout(10_000),
        next: { revalidate: 600 },
      }),
    ]);

    if (!chainsRes.ok) return null;

    const chains = (await chainsRes.json()) as Array<{ name?: string; tvl?: number }>;
    const totalTvlUsd = chains.reduce((s, c) => s + (c.tvl ?? 0), 0);
    const topChains = chains
      .filter((c) => c.name && (c.tvl ?? 0) > 0)
      .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
      .slice(0, 5)
      .map((c) => ({ name: c.name!, tvl: c.tvl! }));

    let change7dPct: number | null = null;
    if (histRes.ok) {
      const hist = (await histRes.json()) as Array<{ date?: number; tvl?: number }>;
      if (hist.length >= 8) {
        const last = hist[hist.length - 1]?.tvl ?? 0;
        const weekAgo = hist[hist.length - 8]?.tvl ?? 0;
        if (weekAgo > 0) change7dPct = ((last - weekAgo) / weekAgo) * 100;
      }
    }

    return { totalTvlUsd, change7dPct, topChains };
  } catch (e) {
    console.warn("DefiLlama unavailable:", e);
    return null;
  }
}

export async function probeDefiLlama(): Promise<{ ok: boolean; error?: string }> {
  const o = await fetchDefiLlamaOverview();
  if (o && o.totalTvlUsd > 0) return { ok: true };
  return { ok: false, error: "no TVL data" };
}
