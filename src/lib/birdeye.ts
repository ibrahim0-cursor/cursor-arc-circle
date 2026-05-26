import type { TokenTx, TokenWhale } from "./storage";
import { birdeyeChainFor } from "./testnet-chains";

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

function birdeyeHeaders(chain: string) {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) return null;
  return { "X-API-KEY": apiKey, "x-chain": chain };
}

export async function fetchBirdeyeOverview(
  address: string,
  chain = "solana",
): Promise<BirdeyeTokenOverview | null> {
  const headers = birdeyeHeaders(chain);
  if (!headers) return null;

  try {
    const res = await fetch(
      `https://public-api.birdeye.so/defi/token_overview?address=${address}`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) return null;

    const json = (await res.json()) as {
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
    };

    const data = json.data;
    if (!data?.price) return null;

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
  } catch {
    return null;
  }
}

export async function fetchBirdeyeSecurity(
  address: string,
  chain = "solana",
): Promise<BirdeyeSecurity | null> {
  const headers = birdeyeHeaders(chain);
  if (!headers) return null;

  try {
    const res = await fetch(
      `https://public-api.birdeye.so/defi/token_security?address=${address}`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) return null;

    const json = (await res.json()) as {
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
    };

    const data = json.data;
    if (!data) return null;

    const sniperWallets =
      data.sniperWallets ??
      data.snipers?.map((s) => s.address).filter(Boolean) as string[] | undefined;

    return {
      sniperCount: data.sniperCount ?? sniperWallets?.length,
      top10HolderPercent: data.top10HolderPercent ?? data.ownerPercentage,
      isMintable: data.isMintable,
      isFreezable: data.isFreezable,
      holderCount: data.holderCount,
      sniperWallets,
    };
  } catch {
    return null;
  }
}

export async function fetchBirdeyeTrades(
  address: string,
  chain: string,
  limit = 15,
): Promise<TokenTx[]> {
  const headers = birdeyeHeaders(chain);
  if (!headers) return [];

  try {
    const res = await fetch(
      `https://public-api.birdeye.so/defi/txs/token?address=${address}&tx_type=swap&limit=${limit}`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) return [];

    const json = (await res.json()) as {
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
    };

    return (json.data?.items ?? []).map((tx) => ({
      hash: tx.txHash,
      type: tx.type ?? "swap",
      side: tx.side === "buy" ? "buy" : tx.side === "sell" ? "sell" : "unknown",
      amountUsd: tx.volumeUSD ?? 0,
      trader: tx.owner ?? "unknown",
      timestamp: tx.blockUnixTime
        ? new Date(tx.blockUnixTime * 1000).toISOString()
        : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function fetchBirdeyeWhales(
  address: string,
  chain: string,
  limit = 10,
): Promise<TokenWhale[]> {
  const headers = birdeyeHeaders(chain);
  if (!headers) return [];

  try {
    const res = await fetch(
      `https://public-api.birdeye.so/defi/v3/token/holder?address=${address}&offset=0&limit=${limit}`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) return [];

    const json = (await res.json()) as {
      data?: {
        items?: Array<{
          owner?: string;
          uiAmount?: number;
          percentage?: number;
        }>;
      };
    };

    return (json.data?.items ?? []).map((h, i) => ({
      address: h.owner ?? "",
      balance: h.uiAmount ?? 0,
      pct: h.percentage ?? 0,
      label: i === 0 ? "Top whale" : i < 3 ? "Major holder" : "Whale",
    }));
  } catch {
    return [];
  }
}

export async function fetchTokenIntel(address: string, chain: string) {
  const [overview, security] = await Promise.all([
    fetchBirdeyeOverview(address, chain),
    fetchBirdeyeSecurity(address, chain),
  ]);

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
  const [trades, whales, security, overview] = await Promise.all([
    fetchBirdeyeTrades(address, chain),
    fetchBirdeyeWhales(address, chain),
    fetchBirdeyeSecurity(address, chain),
    fetchBirdeyeOverview(address, chain),
  ]);

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

  return {
    chain,
    trades: syntheticTxs.slice(0, 20),
    whales,
    snipers,
    summary: {
      sniperCount: security?.sniperCount ?? snipers.length,
      whaleCount: whales.length,
      top10Pct: security?.top10HolderPercent,
      buy24h: overview?.buy24h ?? fallback?.buys,
      sell24h: overview?.sell24h ?? fallback?.sells,
      holderCount: security?.holderCount ?? overview?.holder,
    },
  };
}
