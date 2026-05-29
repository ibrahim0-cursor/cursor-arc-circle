import { binanceSpotFromTickers, fetchBinance24hTickers } from "./binance-market";
import { fetchGlobalMarket, type GlobalMarket } from "./coingecko";
import { fetchDefiLlamaOverview, type DefiLlamaOverview } from "./defillama-client";
import { fetchFredSeriesContext, type FredSeriesContext } from "./fred-client";
import { fetchDunePrismSnippet, type DuneQuerySnippet } from "./dune-client";

export type PrismMarketSnapshot = GlobalMarket & {
  priceSource: "binance+coingecko" | "binance" | "coingecko";
};

export type PrismMacroSnapshot = {
  market: PrismMarketSnapshot | null;
  defi: DefiLlamaOverview | null;
  fred: FredSeriesContext | null;
  dune: DuneQuerySnippet | null;
  factors: string[];
};

function mergeMarkets(
  binance: ReturnType<typeof binanceSpotFromTickers>,
  gecko: GlobalMarket | null,
): PrismMarketSnapshot | null {
  if (!binance && !gecko) return null;

  const btcPrice = binance?.btcPrice || gecko?.btcPrice || 0;
  const ethPrice = binance?.ethPrice || gecko?.ethPrice || 0;

  return {
    btcPrice,
    btcChange24h: binance?.btcChange24h ?? gecko?.btcChange24h ?? 0,
    ethPrice,
    ethChange24h: binance?.ethChange24h ?? gecko?.ethChange24h ?? 0,
    totalMarketCapUsd: gecko?.totalMarketCapUsd ?? 0,
    marketCapChange24h: gecko?.marketCapChange24h ?? 0,
    priceSource: binance && gecko ? "binance+coingecko" : binance ? "binance" : "coingecko",
  };
}

function buildFactors(
  market: PrismMarketSnapshot | null,
  defi: DefiLlamaOverview | null,
  fred: FredSeriesContext | null,
  dune: DuneQuerySnippet | null,
): string[] {
  const factors: string[] = [];

  if (market) {
    factors.push(
      `BTC ${market.btcChange24h >= 0 ? "+" : ""}${market.btcChange24h.toFixed(2)}% (24h, ${market.priceSource})`,
    );
    factors.push(
      `ETH ${market.ethChange24h >= 0 ? "+" : ""}${market.ethChange24h.toFixed(2)}% (24h)`,
    );
    if (market.totalMarketCapUsd > 0) {
      factors.push(
        `Crypto mcap ${market.marketCapChange24h >= 0 ? "+" : ""}${market.marketCapChange24h.toFixed(2)}% (24h, CoinGecko)`,
      );
    }
  }

  if (defi) {
    const tvlB = (defi.totalTvlUsd / 1e9).toFixed(2);
    const ch = defi.change7dPct != null ? `, 7d ${defi.change7dPct >= 0 ? "+" : ""}${defi.change7dPct.toFixed(1)}%` : "";
    factors.push(`DeFi TVL $${tvlB}B${ch} (DefiLlama)`);
  }

  if (fred) {
    const ch =
      fred.changePct != null
        ? ` (${fred.changePct >= 0 ? "+" : ""}${fred.changePct.toFixed(2)}% vs prior)`
        : "";
    factors.push(`${fred.label}: ${fred.latest.value}${fred.unit ? ` ${fred.unit}` : ""}${ch} (FRED)`);
  }

  if (dune) {
    const keys = Object.keys(dune.sample).slice(0, 2).join(", ");
    factors.push(`Dune on-chain query #${dune.queryId} (${dune.rowCount} rows${keys ? `: ${keys}` : ""})`);
  }

  return factors;
}

/** Quantitative macro context for PRISM forecasts — parallel, cached fetches. */
export async function buildPrismMacroSnapshot(eventId: string): Promise<PrismMacroSnapshot> {
  const [tickers, gecko, defi, fred, dune] = await Promise.all([
    fetchBinance24hTickers(),
    fetchGlobalMarket(),
    fetchDefiLlamaOverview(),
    fetchFredSeriesContext(eventId),
    fetchDunePrismSnippet(),
  ]);

  const market = mergeMarkets(binanceSpotFromTickers(tickers), gecko);
  const factors = buildFactors(market, defi, fred, dune);

  return { market, defi, fred, dune, factors };
}

/** Adjust heuristic probability using live macro readings. */
export function macroProbabilityAdjust(
  base: number,
  category: "macro" | "geopolitical" | "markets",
  snapshot: PrismMacroSnapshot,
): number {
  let p = base;

  if (snapshot.market) {
    const riskOff = snapshot.market.btcChange24h < -2 || snapshot.market.marketCapChange24h < -2;
    const riskOn = snapshot.market.btcChange24h > 2 && snapshot.market.marketCapChange24h > 0;
    if (category === "markets" && riskOn) p += 6;
    if (riskOff && category !== "macro") p -= 4;
    if (riskOn && category === "geopolitical") p -= 3;
  }

  if (snapshot.defi?.change7dPct != null) {
    if (snapshot.defi.change7dPct < -5) p -= 3;
    if (snapshot.defi.change7dPct > 5 && category === "markets") p += 4;
  }

  if (snapshot.fred?.changePct != null && category === "macro") {
    if (snapshot.fred.seriesId === "CPIAUCSL" && snapshot.fred.changePct > 0) p += 5;
    if (snapshot.fred.seriesId === "DFF" && snapshot.fred.changePct < 0) p += 6;
    if (snapshot.fred.seriesId === "DCOILWTICO" && snapshot.fred.changePct > 3) p += 5;
  }

  return Math.min(92, Math.max(8, Math.round(p)));
}
