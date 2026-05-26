import type { CryptoNewsItem } from "./crypto-news";
import type { TrendingToken } from "./dexscreener";
import type { AgentSignal, TechnicalSnapshot, TokenIntel } from "./storage";

export type NexusResearchReport = {
  symbol: string;
  generatedAt: string;
  thesis: string;
  watchLevels: string[];
  risks: string[];
  catalysts: string[];
  whaleInsight: string;
  liquidityNote: string;
  taSummary: string;
  /** Action from feed — shown as context only, not the headline */
  signalContext: string;
};

export function buildResearchReport(input: {
  token: TrendingToken;
  agent: AgentSignal;
  intel: TokenIntel;
  technical?: TechnicalSnapshot;
  news?: CryptoNewsItem[];
}): NexusResearchReport {
  const { token, agent, intel, technical, news = [] } = input;
  const ta = technical ?? intel.technical;
  const liq = token.liquidityUsd;
  const vol = token.volume24h;
  const turnover = liq > 0 ? vol / liq : 0;
  const holders = intel.holderCount;
  const whales = intel.whaleCount;
  const top10 = intel.top10HolderPercent;
  const snipers = intel.sniperCount;

  const watchLevels: string[] = [];
  if (token.priceUsd > 0) {
    watchLevels.push(`Support zone near ${(token.priceUsd * 0.92).toFixed(token.priceUsd < 1 ? 6 : 2)} (−8% from spot)`);
    watchLevels.push(`Resistance / extension near ${(token.priceUsd * 1.12).toFixed(token.priceUsd < 1 ? 6 : 2)} (+12%)`);
  }
  if (ta?.rsi != null) {
    watchLevels.push(`RSI ${ta.rsi.toFixed(0)} — ${ta.rsiSignal}`);
  }

  const risks: string[] = [];
  if ((snipers ?? 0) > 3) risks.push(`${snipers} sniper wallets flagged — exit liquidity risk on memecoins`);
  if ((top10 ?? 0) > 45) risks.push(`Top 10 holders control ~${top10?.toFixed(0)}% — concentration risk`);
  if (turnover > 8) risks.push(`Very high turnover (${turnover.toFixed(1)}x) — volatile, size positions small`);
  if (liq < 50_000) risks.push(`Thin pool ($${(liq / 1000).toFixed(0)}K liquidity) — slippage on larger buys`);
  if (agent.riskScore >= 65) risks.push(`Agent risk score ${agent.riskScore}/100 — treat as speculative`);
  if (risks.length === 0) risks.push("No major structural flags — still use stops; feed signal can flip on next refresh");

  const catalysts = news.slice(0, 4).map((n) => `${n.title}${n.source ? ` (${n.source})` : ""}`);
  if (catalysts.length === 0) {
    catalysts.push("No symbol-specific headlines — watch macro and chain volume on DexScreener");
  }

  const whaleInsight =
    whales != null && holders != null
      ? `${whales} whale-sized wallets · ${holders.toLocaleString()} holders · ${intel.buy24h ?? "—"} buys / ${intel.sell24h ?? "—"} sells (24h)`
      : "Whale/holder data limited — run Memory Scan or connect Birdeye for full on-chain snapshot";

  const liquidityNote =
    liq >= 100_000
      ? `$${(liq / 1000).toFixed(0)}K liquidity · ${turnover.toFixed(1)}x 24h turnover — ${turnover > 3 ? "active tape" : "moderate activity"}`
      : `Low liquidity relative to volume — prefer small clips or limit-style entries`;

  const taSummary = ta
    ? `${ta.trend} · MACD ${ta.macdSignal} · TA score ${ta.score}/100`
    : "Technical bundle loading from DexScreener price action";

  const topFactor = agent.reasoningFactors?.[0];
  const thesis = topFactor
    ? `${token.symbol}: ${topFactor.label} — ${topFactor.detail} Combined with ${taSummary.toLowerCase()}, focus on ${agent.action === "BUY" ? "staged entries" : agent.action === "SELL" ? "taking profit or avoiding new size" : "waiting for a clearer edge"} rather than chasing the headline signal alone.`
    : `${token.symbol} @ ${token.priceUsd}: ${agent.whyAction ?? agent.reasoning}`;

  return {
    symbol: token.symbol,
    generatedAt: new Date().toISOString(),
    thesis,
    watchLevels,
    risks,
    catalysts,
    whaleInsight,
    liquidityNote,
    taSummary,
    signalContext: `Feed signal: ${agent.action} ${agent.confidence}% (reference only — research below is the deep view)`,
  };
}
