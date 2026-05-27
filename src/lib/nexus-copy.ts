/** User-facing NEXUS copy — no vendor / pipeline names */

export const NEXUS_TAGLINE =
  "We read the market so you don't have to stare at 50 columns like a pro terminal.";

/** Cycling hero headlines — Alpha Scan / agent research focus */
export const NEXUS_ALPHA_HERO_LINES = [
  "momentum before the crowd",
  "liquidity · sentiment · risk",
  "alpha ranked by your agent",
  "research — not a data wall",
] as const;

export const NEXUS_ALPHA_HERO_SUB =
  "Pro meme-coin research in the background — you get ranked setups and plain verdicts, not a 50-column terminal.";

/** Shown above optional intel panels (under chart) */
export const NEXUS_INTEL_BRIEF =
  "NEXUS is built for pro meme-coin hunters: the agent fuses on-chain flow, holder concentration, multi-timeframe TA (Birdeye when available), GMGN smart money, OpenNews/Twitter sweeps, and rug heuristics — then outputs BUY · SELL · HOLD with a written thesis. Expand sections below when you want the full reasoning; the feed and Alpha Scan already run a lighter pass on every token.";

export const NEXUS_AGENT_LAYERS = [
  "Dex liquidity & 24h buy/sell flow",
  "Birdeye OHLCV · RSI · MACD · MAs",
  "GMGN holders & smart-money tags",
  "6551 news / Twitter buzz",
  "Bubblemaps-style concentration & scam checks",
] as const;

export const NEXUS_VALUE_STEPS = [
  {
    title: "Agent scans",
    detail: "Liquidity, whales, social buzz, scams, momentum — handled in the background.",
  },
  {
    title: "You get a verdict",
    detail: "BUY · SELL · HOLD, risk score, and a plain-English reason — not raw wallet tables.",
  },
  {
    title: "One-tap trade",
    detail: "Buy, sell, swap, or portfolio P&L on Arc — without leaving the flow.",
  },
] as const;

/** What GMGN-style terminals show manually vs what NEXUS automates */
export const NEXUS_AUTOMATES = [
  "Top traders & holder tables",
  "Snipers, insiders, honeypot checks",
  "Social / trench trending",
  "24h flow, MC, liquidity bands",
  "Security badges & rug signals",
] as const;

export const ALPHA_SCAN_LOADING =
  "Your agent is doing the hard work — ranking setups by momentum, sentiment, liquidity, and risk. About a minute.";

export const ALPHA_SCAN_EMPTY =
  "Run a scan from the hero above — the agent will research dozens of tokens and return a short ranked list.";

export const ALPHA_SCAN_ERROR_TIP =
  "Stay on Arc Testnet, approve the scan fee if prompted, and try again in a moment.";

export const ALPHA_SCAN_SUCCESS = (count: number, topSymbol?: string, sentiment?: string) =>
  `${count} picks ready${topSymbol ? ` · best: ${topSymbol}` : ""}${sentiment ? ` · ${sentiment}` : ""}`;

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

export const FEED_INTEL_LABEL = "Live feed";
export const ALPHA_INTEL_LABEL = "Alpha deep intel";

export const FEED_ROW_HINT =
  "Dex-verified price & flow · light agent pass (not a paid deep scan)";

export const ALPHA_LIST_INTRO =
  "Ranked after your Arc scan fee — GMGN, Birdeye, news, smart money, and full agent thesis. Tap a row for chart + deep reasoning.";

/** One-line agent verdict for list rows */
export function agentVerdictLine(whyAction?: string, thesis?: string, reasoning?: string): string {
  const line = (whyAction || thesis || reasoning || "").trim();
  if (!line) return "Agent is still gathering context for this token.";
  const first = line.split(/[.!?]\s/)[0] ?? line;
  return first.length > 140 ? `${first.slice(0, 137)}…` : first;
}
