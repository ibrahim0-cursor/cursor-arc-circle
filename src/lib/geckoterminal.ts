/**
 * GeckoTerminal API v2 — free, no key. https://api.geckoterminal.com/api/v2
 * Complements DexScreener for Alpha scan trending discovery.
 */

import type { TrendingToken } from "./dexscreener";
import { isStablecoin } from "./token-filters";
import { checkSwappable } from "./swappable";

const BASE = "https://api.geckoterminal.com/api/v2";
const CACHE_MS = 90_000;

type GeckoPoolRow = {
  id: string;
  attributes: {
    address: string;
    name: string;
    base_token_price_usd: string;
    price_change_percentage?: { h24?: string; h1?: string; m5?: string };
    volume_usd?: { h24?: string };
    reserve_in_usd?: string;
    market_cap_usd?: string | null;
    fdv_usd?: string;
    transactions?: { h24?: { buys?: number; sells?: number } };
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
  };
};

const NETWORK_TO_CHAIN: Record<string, string> = {
  eth: "ethereum",
  base: "base",
  arbitrum: "arbitrum",
  bsc: "bsc",
  polygon: "polygon",
  optimism: "optimism",
  avax: "avalanche",
  solana: "solana",
};

const cache = new Map<string, { at: number; tokens: TrendingToken[] }>();

function parseTokenAddress(geckoTokenId?: string): string | null {
  if (!geckoTokenId) return null;
  const i = geckoTokenId.indexOf("_");
  if (i < 0) return null;
  return geckoTokenId.slice(i + 1).toLowerCase();
}

function poolToToken(network: string, pool: GeckoPoolRow): TrendingToken | null {
  const chainId = NETWORK_TO_CHAIN[network] ?? network;
  const addr = parseTokenAddress(pool.relationships?.base_token?.data?.id);
  if (!addr) return null;

  const nameParts = (pool.attributes.name ?? "").split("/").map((s) => s.trim());
  const symbol = (nameParts[0] ?? "???").replace(/^\$/, "");
  const priceUsd = Number(pool.attributes.base_token_price_usd ?? 0);
  const change24h = Number(pool.attributes.price_change_percentage?.h24 ?? 0);
  const volume24h = Number(pool.attributes.volume_usd?.h24 ?? 0);
  const liquidityUsd = Number(pool.attributes.reserve_in_usd ?? 0);

  const token: TrendingToken = {
    symbol,
    name: symbol,
    tokenAddress: addr,
    chainId,
    pairAddress: pool.attributes.address,
    priceUsd,
    change24h,
    priceChange: {
      h24: change24h,
      h1: Number(pool.attributes.price_change_percentage?.h1 ?? 0),
      m5: Number(pool.attributes.price_change_percentage?.m5 ?? 0),
    },
    volume24h,
    liquidityUsd,
    marketCap: pool.attributes.market_cap_usd ? Number(pool.attributes.market_cap_usd) : undefined,
    fdv: pool.attributes.fdv_usd ? Number(pool.attributes.fdv_usd) : undefined,
    url: `https://www.geckoterminal.com/${network}/pools/${pool.attributes.address}`,
    txns24h: {
      buys: pool.attributes.transactions?.h24?.buys ?? 0,
      sells: pool.attributes.transactions?.h24?.sells ?? 0,
    },
    quoteSymbol: nameParts[1],
  };
  token.swappable = checkSwappable(token).ok;
  return token;
}

export async function fetchGeckoTrendingForNetwork(
  network: string,
  page = 1,
): Promise<TrendingToken[]> {
  const cacheKey = `${network}:${page}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.tokens;

  try {
    const res = await fetch(`${BASE}/networks/${network}/trending_pools?page=${page}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const json = (await res.json()) as { data?: GeckoPoolRow[] };
    const tokens = (json.data ?? [])
      .map((p) => poolToToken(network, p))
      .filter((t): t is TrendingToken => t !== null && t.priceUsd > 0);

    cache.set(cacheKey, { at: Date.now(), tokens });
    return tokens;
  } catch {
    return [];
  }
}

/** Trending pools across networks (rate-limit friendly: 3 networks max). */
export async function fetchGeckoAlphaCandidates(
  networks = ["base", "arbitrum", "eth"],
  perNetwork = 12,
): Promise<TrendingToken[]> {
  const lists = await Promise.all(
    networks.slice(0, 3).map((n) => fetchGeckoTrendingForNetwork(n, 1)),
  );
  const merged: TrendingToken[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const t of list.slice(0, perNetwork)) {
      const key = `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(t);
    }
  }
  return merged.filter(
    (t) =>
      !isStablecoin(t.symbol, t.name, {
        tokenAddress: t.tokenAddress,
        chainId: t.chainId,
        priceUsd: t.priceUsd,
        change24h: t.change24h,
      }),
  );
}

/** Merge Gecko discoveries into DexScreener feed; Dex data wins on duplicates. */
export function mergeTrendingWithGecko(
  primary: TrendingToken[],
  gecko: TrendingToken[],
  maxTotal: number,
): TrendingToken[] {
  const byKey = new Map<string, TrendingToken>();
  for (const t of primary) {
    byKey.set(`${t.chainId}:${t.tokenAddress.toLowerCase()}`, t);
  }
  for (const g of gecko) {
    const key = `${g.chainId}:${g.tokenAddress.toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, g);
  }
  return Array.from(byKey.values()).slice(0, maxTotal);
}

export async function probeGeckoTerminal(): Promise<{ ok: boolean; error?: string }> {
  const tokens = await fetchGeckoTrendingForNetwork("base", 1);
  if (tokens.length > 0) return { ok: true };
  return { ok: false, error: "no trending pools returned" };
}
