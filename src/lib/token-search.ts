import type { TrendingToken } from "./dexscreener";
import { isStablecoin } from "./token-filters";

type DexPair = {
  chainId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { symbol: string };
  priceUsd?: string;
  priceChange?: { h5?: number; m5?: number; h1?: number; h6?: number; h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  txns?: { h24?: { buys?: number; sells?: number } };
  info?: { imageUrl?: string };
};

function pairToToken(pair: DexPair): TrendingToken {
  return {
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    tokenAddress: pair.baseToken.address,
    chainId: pair.chainId,
    pairAddress: pair.pairAddress,
    priceUsd: Number(pair.priceUsd ?? 0),
    change24h: pair.priceChange?.h24 ?? 0,
    priceChange: {
      m5: pair.priceChange?.m5,
      h1: pair.priceChange?.h1,
      h6: pair.priceChange?.h6,
      h24: pair.priceChange?.h24 ?? 0,
    },
    volume24h: pair.volume?.h24 ?? 0,
    liquidityUsd: pair.liquidity?.usd ?? 0,
    marketCap: pair.marketCap,
    fdv: pair.fdv,
    icon: pair.info?.imageUrl,
    url: pair.url,
    txns24h: {
      buys: pair.txns?.h24?.buys ?? 0,
      sells: pair.txns?.h24?.sells ?? 0,
    },
    quoteSymbol: pair.quoteToken.symbol,
  };
}

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function isEvmContractAddress(q: string): boolean {
  return EVM_ADDRESS.test(q.trim());
}

export function filterCatalogTokens(
  catalog: TrendingToken[],
  query: string,
  chainId?: string,
): TrendingToken[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog.filter((t) => !chainId || t.chainId === chainId).slice(0, 12);

  return catalog
    .filter((t) => {
      if (chainId && t.chainId !== chainId) return false;
      const sym = t.symbol.toLowerCase();
      const name = (t.name ?? "").toLowerCase();
      const addr = t.tokenAddress.toLowerCase();
      return sym.includes(q) || name.includes(q) || addr.includes(q) || q.includes(sym);
    })
    .slice(0, 12);
}

export async function searchDexScreenerTokens(
  query: string,
  chainId?: string,
): Promise<TrendingToken[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
      { cache: "no-store", signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { pairs?: DexPair[] };
    const out: TrendingToken[] = [];
    const seen = new Set<string>();
    for (const pair of json.pairs ?? []) {
      if (chainId && pair.chainId !== chainId) continue;
      const t = pairToToken(pair);
      if (t.priceUsd <= 0) continue;
      if (
        isStablecoin(t.symbol, t.name, {
          tokenAddress: t.tokenAddress,
          chainId: t.chainId,
          priceUsd: t.priceUsd,
          change24h: t.change24h,
        })
      ) {
        continue;
      }
      const key = `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
      if (out.length >= 10) break;
    }
    return out;
  } catch {
    return [];
  }
}
