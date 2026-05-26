import { WALLET_SWAP_CHAINS, SWAP_CRITERIA, checkSwappable, filterSwappableTokens, type WalletSwapChain } from "./swappable";
import { isEvmChain } from "./swap";
import { fetchTokenIntel } from "./birdeye";
import { birdeyeChainFor } from "./testnet-chains";

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
  quoteSymbol?: string;
  swappable?: boolean;
  demoTradeable?: boolean;
  suggestedNetwork?: string;
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
  const token: TrendingToken = {
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
    quoteSymbol: pair.quoteToken.symbol,
  };
  token.swappable = checkSwappable(token).ok;
  return token;
}

async function loadPair(chainId: string, tokenAddress: string) {
  const pairRes = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/${chainId}/${tokenAddress}`,
    { next: { revalidate: 30 } },
  );
  if (!pairRes.ok) return null;

  const data = (await pairRes.json()) as DexPair[];
  const withQuote = data.filter((p) =>
    SWAP_CRITERIA.quoteSymbols.some(
      (q) => p.quoteToken.symbol.toUpperCase() === q || p.baseToken.symbol.toUpperCase() === q,
    ),
  );
  const pool = withQuote.length ? withQuote : data;
  const best = pool.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  if (!best || Number(best.priceUsd ?? 0) <= 0) return null;
  return mapPair(best);
}

/** Wallet-swappable tokens only — EVM + liquidity + volume criteria */
export async function fetchSwappableTokens(limit = 8, preferredChain?: string) {
  const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error("DexScreener boosts unavailable");

  const boosts = (await res.json()) as Array<{ chainId: string; tokenAddress: string }>;

  const evmBoosts = boosts.filter(
    (b) =>
      isEvmChain(b.chainId) &&
      WALLET_SWAP_CHAINS.includes(b.chainId as WalletSwapChain) &&
      (!preferredChain || b.chainId === preferredChain),
  );

  const pairs: TrendingToken[] = [];
  for (const token of evmBoosts) {
    const pair = await loadPair(token.chainId, token.tokenAddress);
    if (pair) pairs.push(pair);
  }

  let filtered = filterSwappableTokens(pairs, preferredChain);

  if (filtered.length < limit) {
    for (const chain of preferredChain ? [preferredChain] : WALLET_SWAP_CHAINS) {
      const searchRes = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${chain}%20USDC`,
        { next: { revalidate: 30 } },
      );
      if (!searchRes.ok) continue;
      const search = (await searchRes.json()) as { pairs?: DexPair[] };
      for (const pair of search.pairs ?? []) {
        if (pair.chainId !== chain) continue;
        const mapped = mapPair(pair);
        if (checkSwappable(mapped, preferredChain).ok) {
          filtered.push(mapped);
        }
      }
    }
    filtered = filterSwappableTokens(
      Array.from(new Map(filtered.map((t) => [`${t.chainId}:${t.tokenAddress}`, t])).values()),
      preferredChain,
    );
  }

  return filtered
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
    .slice(0, limit);
}

/** Trending tokens for demo trading — live DexScreener + optional Birdeye intel */
export async function fetchTrendingMarketTokens(limit = 12) {
  const tokens: TrendingToken[] = [];
  const seen = new Set<string>();

  function addToken(token: TrendingToken | null) {
    if (!token || token.priceUsd <= 0) return;
    const key = `${token.chainId}:${token.tokenAddress}`;
    if (seen.has(key)) return;
    seen.add(key);
    tokens.push({ ...token, demoTradeable: true, suggestedNetwork: "arc" });
  }

  const [boostsRes, searchResults] = await Promise.all([
    fetch("https://api.dexscreener.com/token-boosts/top/v1", { next: { revalidate: 30 } }),
    Promise.all(
      WALLET_SWAP_CHAINS.map(async (chain) => {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/search?q=${chain}`,
          { next: { revalidate: 30 } },
        );
        if (!res.ok) return [] as DexPair[];
        const json = (await res.json()) as { pairs?: DexPair[] };
        return (json.pairs ?? []).filter((p) => p.chainId === chain);
      }),
    ),
  ]);

  if (boostsRes.ok) {
    const boosts = (await boostsRes.json()) as Array<{ chainId: string; tokenAddress: string }>;
    const evmBoosts = boosts.filter(
      (b) =>
        isEvmChain(b.chainId) &&
        WALLET_SWAP_CHAINS.includes(b.chainId as WalletSwapChain),
    );

    const boostPairs = await Promise.all(
      evmBoosts.slice(0, 30).map((b) => loadPair(b.chainId, b.tokenAddress)),
    );
    boostPairs.forEach(addToken);
  }

  for (const pairs of searchResults) {
    for (const pair of pairs.slice(0, 15)) {
      addToken(mapPair(pair));
    }
  }

  const sorted = tokens
    .sort((a, b) => b.volume24h - a.volume24h || b.liquidityUsd - a.liquidityUsd)
    .slice(0, limit);

  const enriched = await Promise.all(
    sorted.map(async (token) => {
      try {
        const { intel } = await fetchTokenIntel(
          token.tokenAddress,
          birdeyeChainFor(token.chainId),
        );
        return {
          ...token,
          marketCap: intel.marketCap ?? token.marketCap,
          fdv: intel.fdv ?? token.fdv,
          intel,
        };
      } catch {
        return token;
      }
    }),
  );

  return enriched;
}

/** @deprecated use fetchSwappableTokens */
export async function fetchTrendingTokens(limit = 12): Promise<TrendingToken[]> {
  return fetchSwappableTokens(limit);
}

export async function fetchTokenPair(chainId: string, tokenAddress: string) {
  const pair = await loadPair(chainId, tokenAddress);
  if (!pair || !checkSwappable(pair).ok) return null;
  return pair;
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
