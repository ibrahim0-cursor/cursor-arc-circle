export type TrendingToken = {
  symbol: string;
  name: string;
  tokenAddress: string;
  chainId: string;
  pairAddress: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCap?: number;
  fdv?: number;
  icon?: string;
  url: string;
  txns24h?: { buys: number; sells: number };
};

type DexPair = {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { symbol: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  txns?: { h24?: { buys?: number; sells?: number } };
  info?: { imageUrl?: string };
};

function mapPair(pair: DexPair): TrendingToken {
  return {
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    tokenAddress: pair.baseToken.address,
    chainId: pair.chainId,
    pairAddress: pair.pairAddress,
    priceUsd: Number(pair.priceUsd ?? 0),
    change24h: pair.priceChange?.h24 ?? 0,
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
  };
}

export async function fetchTrendingTokens(limit = 12): Promise<TrendingToken[]> {
  const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error("DexScreener boosts unavailable");

  const boosts = (await res.json()) as Array<{ chainId: string; tokenAddress: string }>;
  const unique = new Map<string, { chainId: string; tokenAddress: string }>();
  for (const boost of boosts) {
    unique.set(`${boost.chainId}:${boost.tokenAddress}`, boost);
  }

  const pairs: TrendingToken[] = [];
  for (const token of Array.from(unique.values()).slice(0, limit)) {
    const pairRes = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/${token.chainId}/${token.tokenAddress}`,
      { next: { revalidate: 30 } },
    );
    if (!pairRes.ok) continue;

    const data = (await pairRes.json()) as DexPair[];
    const best = data.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    if (!best?.priceUsd) continue;
    pairs.push(mapPair(best));
  }

  if (pairs.length > 0) return pairs;

  const fallbackRes = await fetch("https://api.dexscreener.com/latest/dex/search?q=USDC", {
    next: { revalidate: 30 },
  });
  const fallback = (await fallbackRes.json()) as { pairs?: DexPair[] };
  return (fallback.pairs ?? []).slice(0, limit).map(mapPair);
}

export async function fetchTokenPair(chainId: string, tokenAddress: string) {
  const res = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/${chainId}/${tokenAddress}`,
    { next: { revalidate: 15 } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as DexPair[];
  const best = data.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  return best ? mapPair(best) : null;
}

export function dexChartEmbedUrl(chainId: string, pairAddress: string) {
  return `https://dexscreener.com/${chainId}/${pairAddress}?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15`;
}

export function jupiterSwapUrl(tokenAddress: string) {
  return `https://jup.ag/swap/SOL-${tokenAddress}`;
}

export function zeroXSwapUrl(chainId: number, buyToken: string) {
  const base = chainId === 8453 ? "https://base.app" : "https://app.uniswap.org";
  return `${base}/swap?outputCurrency=${buyToken}&chain=${chainId === 8453 ? "base" : "mainnet"}`;
}
