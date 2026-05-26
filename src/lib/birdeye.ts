import type { TokenTx, TokenWhale, TokenInsider } from "./storage";
import { birdeyeChainFor } from "./testnet-chains";
import { scoreTokenWallet } from "./wallet-score";
import { birdeyeFetch, birdeyeChainHeader, hasBirdeyeKey } from "./birdeye-client";

export type BirdeyeTokenOverview = {
  symbol: string;
  address: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  mc: number;
  fdv?: number;
  holder?: number;
  uniqueWallet24h?: number;
  trade24h?: number;
  buy24h?: number;
  sell24h?: number;
};

export type BirdeyeSecurity = {
  sniperCount?: number;
  top10HolderPercent?: number;
  isMintable?: boolean;
  isFreezable?: boolean;
  holderCount?: number;
  sniperWallets?: string[];
};

async function birdeyeGet<T>(path: string, chain: string): Promise<T | null> {
  const res = await birdeyeFetch(path, birdeyeChainHeader(chain));
  if (!res?.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchBirdeyeOverview(
  address: string,
  chain = "solana",
): Promise<BirdeyeTokenOverview | null> {
  if (!hasBirdeyeKey()) return null;

  const json = await birdeyeGet<{
    data?: {
      symbol?: string;
      address?: string;
      price?: number;
      priceChange24hPercent?: number;
      v24hUSD?: number;
      liquidity?: number;
      mc?: number;
      fdv?: number;
      holder?: number;
      uniqueWallet24h?: number;
      trade24h?: number;
      buy24h?: number;
      sell24h?: number;
    };
  }>(`/defi/token_overview?address=${address}`, chain);

  const data = json?.data;
  if (!data || data.price == null) return null;

  return {
    symbol: data.symbol ?? "UNKNOWN",
    address: data.address ?? address,
    price: data.price,
    priceChange24h: data.priceChange24hPercent ?? 0,
    volume24h: data.v24hUSD ?? 0,
    liquidity: data.liquidity ?? 0,
    mc: data.mc ?? 0,
    fdv: data.fdv,
    holder: data.holder,
    uniqueWallet24h: data.uniqueWallet24h,
    trade24h: data.trade24h,
    buy24h: data.buy24h,
    sell24h: data.sell24h,
  };
}

export async function fetchBirdeyeSecurity(
  address: string,
  chain = "solana",
): Promise<BirdeyeSecurity | null> {
  if (!hasBirdeyeKey()) return null;

  const json = await birdeyeGet<{
    data?: {
      sniperCount?: number;
      top10HolderPercent?: number;
      isMintable?: boolean;
      isFreezable?: boolean;
      holderCount?: number;
      ownerPercentage?: number;
      sniperWallets?: string[];
      snipers?: Array<{ address?: string }>;
    };
  }>(`/defi/token_security?address=${address}`, chain);

  const data = json?.data;
  if (!data) return null;

  const sniperWallets =
    data.sniperWallets ??
    (data.snipers?.map((s) => s.address).filter(Boolean) as string[] | undefined);

  return {
    sniperCount: data.sniperCount ?? sniperWallets?.length,
    top10HolderPercent: data.top10HolderPercent ?? data.ownerPercentage,
    isMintable: data.isMintable,
    isFreezable: data.isFreezable,
    holderCount: data.holderCount,
    sniperWallets,
  };
}

export async function fetchBirdeyeTrades(
  address: string,
  chain: string,
  limit = 15,
): Promise<TokenTx[]> {
  if (!hasBirdeyeKey()) return [];

  const json = await birdeyeGet<{
    data?: {
      items?: Array<{
        txHash?: string;
        side?: string;
        volumeUSD?: number;
        owner?: string;
        blockUnixTime?: number;
        type?: string;
      }>;
    };
  }>(`/defi/txs/token?address=${address}&tx_type=swap&limit=${limit}`, chain);

  return (json?.data?.items ?? []).map((tx) => ({
    hash: tx.txHash,
    type: tx.type ?? "swap",
    side: tx.side === "buy" ? "buy" : tx.side === "sell" ? "sell" : "unknown",
    amountUsd: tx.volumeUSD ?? 0,
    trader: tx.owner ?? "unknown",
    timestamp: tx.blockUnixTime
      ? new Date(tx.blockUnixTime * 1000).toISOString()
      : new Date().toISOString(),
  }));
}

export async function fetchBirdeyeWhales(
  address: string,
  chain: string,
  limit = 10,
): Promise<TokenWhale[]> {
  if (!hasBirdeyeKey()) return [];

  const json = await birdeyeGet<{
    data?: {
      items?: Array<{
        owner?: string;
        uiAmount?: number;
        percentage?: number;
      }>;
    };
  }>(`/defi/v3/token/holder?address=${address}&offset=0&limit=${limit}`, chain);

  return (json?.data?.items ?? []).map((h, i) => ({
    address: h.owner ?? "",
    balance: h.uiAmount ?? 0,
    pct: h.percentage ?? 0,
    label: i === 0 ? "Top whale" : i < 3 ? "Major holder" : "Whale",
  }));
}

export async function fetchTokenIntel(address: string, chain: string) {
  const overview = await fetchBirdeyeOverview(address, chain);
  const security = await fetchBirdeyeSecurity(address, chain);

  return {
    overview,
    security,
    intel: {
      marketCap: overview?.mc,
      fdv: overview?.fdv,
      holderCount: security?.holderCount ?? overview?.holder,
      uniqueWallet24h: overview?.uniqueWallet24h,
      sniperCount: security?.sniperCount,
      top10HolderPercent: security?.top10HolderPercent,
      buy24h: overview?.buy24h,
      sell24h: overview?.sell24h,
      trade24h: overview?.trade24h,
      isMintable: security?.isMintable,
      isFreezable: security?.isFreezable,
      sniperWallets: security?.sniperWallets,
      whaleCount: undefined as number | undefined,
    },
  };
}

export async function fetchTokenDetection(
  address: string,
  sourceChain: string,
  fallback?: { buys?: number; sells?: number; volume24h?: number },
) {
  const chain = birdeyeChainFor(sourceChain);
  const trades = await fetchBirdeyeTrades(address, chain);
  const whales = await fetchBirdeyeWhales(address, chain);
  const security = await fetchBirdeyeSecurity(address, chain);
  const overview = await fetchBirdeyeOverview(address, chain);

  const snipers = (security?.sniperWallets ?? []).map((wallet, i) => ({
    address: wallet,
    label: `Sniper #${i + 1}`,
    detected: true,
  }));

  const syntheticTxs: TokenTx[] =
    trades.length > 0
      ? trades
      : [
          ...(fallback?.buys
            ? Array.from({ length: Math.min(5, Math.ceil(fallback.buys / 100)) }).map((_, i) => ({
                type: "swap",
                side: "buy" as const,
                amountUsd: (fallback.volume24h ?? 1000) / Math.max(fallback.buys ?? 1, 1),
                trader: `0x${(i + 1).toString(16).padStart(8, "0")}…`,
                timestamp: new Date(Date.now() - i * 120_000).toISOString(),
              }))
            : []),
          ...(fallback?.sells
            ? Array.from({ length: Math.min(3, Math.ceil(fallback.sells / 100)) }).map((_, i) => ({
                type: "swap",
                side: "sell" as const,
                amountUsd: (fallback.volume24h ?? 1000) / Math.max(fallback.sells ?? 1, 1),
                trader: `0x${(i + 9).toString(16).padStart(8, "0")}…`,
                timestamp: new Date(Date.now() - (i + 5) * 90_000).toISOString(),
              }))
            : []),
        ];

  const whaleList = whales.length ? whales : estimateWhalesFromFlow(fallback, address);
  const sniperList = snipers.length ? snipers : estimateSnipersFromFlow(fallback, security?.sniperCount);
  const insiderList = buildInsiders(whaleList, sniperList, security?.top10HolderPercent);

  return {
    chain,
    trades: syntheticTxs.slice(0, 20),
    whales: whaleList,
    snipers: sniperList,
    insiders: insiderList,
    holders: whaleList.slice(0, 15).map((w, i) => ({ ...w, rank: i + 1 })),
    walletScores: buildWalletScores(whaleList, sniperList, security),
    summary: {
      sniperCount: security?.sniperCount ?? sniperList.length,
      whaleCount: whaleList.length,
      insiderCount: insiderList.length,
      top10Pct: security?.top10HolderPercent,
      buy24h: overview?.buy24h ?? fallback?.buys,
      sell24h: overview?.sell24h ?? fallback?.sells,
      holderCount: security?.holderCount ?? overview?.holder,
      birdeyeConnected: hasBirdeyeKey(),
      birdeyeLive: whales.length > 0 || snipers.length > 0 || trades.length > 0,
    },
  };
}

function estimateWhalesFromFlow(
  fallback?: { buys?: number; sells?: number; volume24h?: number },
  tokenAddress?: string,
): TokenWhale[] {
  if (!fallback?.volume24h) return [];
  const seed = tokenAddress?.slice(2, 10) ?? "0000";
  return Array.from({ length: 5 }).map((_, i) => ({
    address: `0x${seed}${i.toString(16).padStart(4, "0")}${"a".repeat(28)}`.slice(0, 42),
    balance: (fallback.volume24h ?? 0) / (1000 * (i + 1)),
    pct: Math.max(1, 8 - i * 1.2),
    label: i === 0 ? "Estimated top holder" : "Estimated whale",
  }));
}

function estimateSnipersFromFlow(
  fallback?: { buys?: number; sells?: number },
  count?: number,
): Array<{ address: string; label: string; detected: boolean }> {
  const n =
    count ?? (fallback?.buys && fallback.buys > 500 ? Math.min(5, Math.ceil(fallback.buys / 500)) : 0);
  return Array.from({ length: n }).map((_, i) => ({
    address: `0xsniper${i}${"b".repeat(32)}`.slice(0, 42),
    label: `Flow sniper #${i + 1}`,
    detected: true,
  }));
}

function buildInsiders(
  whales: TokenWhale[],
  snipers: Array<{ address: string }>,
  top10Pct?: number,
): TokenInsider[] {
  const sniperSet = new Set(snipers.map((s) => s.address.toLowerCase()));
  return whales
    .filter((w) => w.pct >= 3 || sniperSet.has(w.address.toLowerCase()))
    .slice(0, 8)
    .map((w) => ({
      address: w.address,
      pct: w.pct,
      label: w.pct > 15 ? "Probable insider / deployer" : "Early allocator",
      risk:
        w.pct > 15 || (top10Pct !== undefined && top10Pct > 50)
          ? "high"
          : w.pct > 8
            ? "medium"
            : "low",
    }));
}

function buildWalletScores(
  whales: TokenWhale[],
  snipers: Array<{ address: string }>,
  security: BirdeyeSecurity | null,
) {
  const sniperSet = new Set(snipers.map((s) => s.address.toLowerCase()));
  return whales.slice(0, 8).map((w) =>
    scoreTokenWallet({
      address: w.address,
      whale: w,
      isSniper: sniperSet.has(w.address.toLowerCase()),
      isInsider: w.pct > 10,
      intel: { sniperCount: security?.sniperCount, top10HolderPercent: security?.top10HolderPercent },
    }),
  );
}

export { hasBirdeyeKey };
