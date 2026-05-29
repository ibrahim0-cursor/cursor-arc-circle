/** Binance public market data — use data-api.binance.vision (no API key). */

const DEFAULT_BASE = "https://data-api.binance.vision";

function baseUrl() {
  return (process.env.BINANCE_DATA_API_BASE ?? DEFAULT_BASE).replace(/\/$/, "");
}

export type BinanceTicker = {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  volume: number;
};

export async function fetchBinance24hTickers(
  symbols = ["BTCUSDT", "ETHUSDT"],
): Promise<BinanceTicker[]> {
  try {
    const q = encodeURIComponent(JSON.stringify(symbols));
    const res = await fetch(`${baseUrl()}/api/v3/ticker/24hr?symbols=${q}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 45 },
    });
    if (!res.ok) return [];

    const rows = (await res.json()) as Array<{
      symbol?: string;
      lastPrice?: string;
      priceChangePercent?: string;
      volume?: string;
    }>;

    return rows
      .map((r) => ({
        symbol: r.symbol ?? "",
        lastPrice: Number(r.lastPrice) || 0,
        priceChangePercent: Number(r.priceChangePercent) || 0,
        volume: Number(r.volume) || 0,
      }))
      .filter((r) => r.symbol && r.lastPrice > 0);
  } catch (e) {
    console.warn("Binance market unavailable:", e);
    return [];
  }
}

export function binanceSpotFromTickers(tickers: BinanceTicker[]) {
  const btc = tickers.find((t) => t.symbol === "BTCUSDT");
  const eth = tickers.find((t) => t.symbol === "ETHUSDT");
  if (!btc && !eth) return null;

  return {
    btcPrice: btc?.lastPrice ?? 0,
    btcChange24h: btc?.priceChangePercent ?? 0,
    ethPrice: eth?.lastPrice ?? 0,
    ethChange24h: eth?.priceChangePercent ?? 0,
    source: "binance" as const,
  };
}

export async function probeBinanceMarket(): Promise<{ ok: boolean; error?: string }> {
  const tickers = await fetchBinance24hTickers(["BTCUSDT"]);
  if (tickers.length > 0) return { ok: true };
  return { ok: false, error: "no ticker data" };
}
