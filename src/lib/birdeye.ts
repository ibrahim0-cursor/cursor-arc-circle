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
      { headers, next: { revalidate: 60 } },
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
      { headers, next: { revalidate: 120 } },
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
      };
    };

    const data = json.data;
    if (!data) return null;

    return {
      sniperCount: data.sniperCount,
      top10HolderPercent: data.top10HolderPercent ?? data.ownerPercentage,
      isMintable: data.isMintable,
      isFreezable: data.isFreezable,
      holderCount: data.holderCount,
    };
  } catch {
    return null;
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
    },
  };
}
