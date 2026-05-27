/** User-facing NEXUS copy — no vendor / pipeline names */

export const ALPHA_SCAN_LOADING =
  "Ranking opportunities by momentum, sentiment, liquidity, and risk. This usually takes about a minute.";

export const ALPHA_SCAN_EMPTY =
  "Run Alpha Scan to get a ranked list with scores, thesis, and risk breakdown. Connect your wallet first.";

export const ALPHA_SCAN_ERROR_TIP =
  "Stay on Arc Testnet, approve the scan fee if prompted, and try again in a moment.";

export const ALPHA_SCAN_SUCCESS = (count: number, topSymbol?: string, sentiment?: string) =>
  `${count} ranked${topSymbol ? ` · top pick ${topSymbol}` : ""}${sentiment ? ` · ${sentiment}` : ""}`;

export const SAVED_SCANS_LABEL = (n: number, max: number) =>
  n > 0 ? `Saved scans (${Math.min(n, max)} archived)` : "Saved scans";

export function publicSourceLabel(tag: string): string {
  if (/signal/i.test(tag)) return "Live signal";
  if (/trending/i.test(tag)) return "Trending";
  if (/dex/i.test(tag)) return "Market data";
  if (/gecko/i.test(tag)) return "Trending pool";
  return "Intel";
}

export function publicSentimentSummary(label: string, score: number): string {
  const tone =
    label === "Risk-on"
      ? "Risk appetite is elevated — flows favor aggressive setups."
      : label === "Cautiously bullish"
        ? "Conditions lean positive but selective sizing is warranted."
        : label === "Risk-off"
          ? "Defensive tone — favor capital preservation and tighter risk."
          : "Mixed tape — focus on liquidity and clear catalysts.";
  return `${tone} (index ${score}).`;
}
