/** CoinGecko demo API — uses COINGECKO_API_KEY when set */

function coingeckoUrl(path: string) {
  const key = process.env.COINGECKO_API_KEY?.trim();
  const base = `https://api.coingecko.com/api/v3${path}`;
  if (!key) return base;
  const sep = path.includes("?") ? "&" : "?";
  return `${base}${sep}x_cg_demo_api_key=${encodeURIComponent(key)}`;
}

export type GlobalMarket = {
  btcPrice: number;
  btcChange24h: number;
  ethPrice: number;
  ethChange24h: number;
  totalMarketCapUsd: number;
  marketCapChange24h: number;
};

export async function fetchGlobalMarket(): Promise<GlobalMarket | null> {
  try {
    const res = await fetch(coingeckoUrl("/global"), {
      next: { revalidate: 120 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        total_market_cap?: { usd?: number };
        market_cap_change_percentage_24h_usd?: number;
      };
    };
    const coins = await fetch(
      coingeckoUrl("/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"),
      { next: { revalidate: 60 }, headers: { Accept: "application/json" } },
    );
    if (!coins.ok) return null;
    const prices = (await coins.json()) as {
      bitcoin?: { usd?: number; usd_24h_change?: number };
      ethereum?: { usd?: number; usd_24h_change?: number };
    };

    return {
      btcPrice: prices.bitcoin?.usd ?? 0,
      btcChange24h: prices.bitcoin?.usd_24h_change ?? 0,
      ethPrice: prices.ethereum?.usd ?? 0,
      ethChange24h: prices.ethereum?.usd_24h_change ?? 0,
      totalMarketCapUsd: json.data?.total_market_cap?.usd ?? 0,
      marketCapChange24h: json.data?.market_cap_change_percentage_24h_usd ?? 0,
    };
  } catch {
    return null;
  }
}
