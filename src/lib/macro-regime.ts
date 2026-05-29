import { fetchGlobalMarket, type GlobalMarket } from "./coingecko";

export type MacroRegime = {
  label: "risk-on" | "risk-off" | "neutral";
  detail: string;
  btcChange24h: number;
  marketCapChange24h: number;
};

let cache: { at: number; value: MacroRegime | null } = { at: 0, value: null };
const TTL_MS = 120_000;

export function regimeFromGlobal(g: GlobalMarket): MacroRegime {
  const btc = g.btcChange24h;
  const mcap = g.marketCapChange24h;
  if (btc > 2 && mcap > 0) {
    return {
      label: "risk-on",
      detail: `BTC ${btc >= 0 ? "+" : ""}${btc.toFixed(1)}% · total mcap ${mcap >= 0 ? "+" : ""}${mcap.toFixed(1)}%`,
      btcChange24h: btc,
      marketCapChange24h: mcap,
    };
  }
  if (btc < -2 || mcap < -1.5) {
    return {
      label: "risk-off",
      detail: `BTC ${btc.toFixed(1)}% · total mcap ${mcap.toFixed(1)}% — defensive sizing`,
      btcChange24h: btc,
      marketCapChange24h: mcap,
    };
  }
  return {
    label: "neutral",
    detail: `BTC ${btc.toFixed(1)}% · mcap ${mcap.toFixed(1)}% — stock-specific signals dominate`,
    btcChange24h: btc,
    marketCapChange24h: mcap,
  };
}

/** Actionable PRISM regime copy — no repeated BTC/mcap tickers (shown in macro panels). */
export function macroRegimeGuidance(regime: MacroRegime): string {
  if (regime.label === "risk-on") {
    return "Risk-on regime — selective momentum longs OK when this token’s liquidity supports clean exits.";
  }
  if (regime.label === "risk-off") {
    return "Risk-off regime — defensive sizing; favor holder quality and exit liquidity over hype entries.";
  }
  return "Neutral macro — token structure, flow skew, and contract risk drive this setup more than index drift.";
}

export async function getMacroRegime(): Promise<MacroRegime | null> {
  if (Date.now() - cache.at < TTL_MS) return cache.value;
  const g = await fetchGlobalMarket();
  cache = { at: Date.now(), value: g ? regimeFromGlobal(g) : null };
  return cache.value;
}
