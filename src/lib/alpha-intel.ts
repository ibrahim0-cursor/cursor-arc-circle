/**
 * Early probabilistic opportunity detection — 6 intelligence layers for Alpha Scan.
 * Uses free/on-chain/community signals (not X scraping).
 */

import type { TrendingToken } from "./dexscreener";
import type { TokenIntel } from "./storage";
import type { AgentSignal } from "./storage";
import type { TokenSocialIntel } from "./social-intel";
import type { CommunityPulse } from "./community-pulse";
import type { CryptoNewsItem } from "./crypto-news";
import { assessTokenScam } from "./scam-detection";
import type { TokenSecurityReport } from "./token-security";
import { fetchGithubDevSignal, type GithubDevSignal } from "./github-dev";

export type AlphaRiskBreakdown = {
  rug: number;
  liquidity: number;
  concentration: number;
  hypeExhaustion: number;
};

export type AlphaIntelReport = {
  alphaScore: number;
  narrativeAcceleration: number;
  narrativeSummary: string;
  smartMoneySignal: string;
  momentumHealth: string;
  riskScore: number;
  riskBreakdown: AlphaRiskBreakdown;
  aiThesis: string;
  ecosystemTags: string[];
  githubDev?: GithubDevSignal | null;
  layerHints: string[];
};

function ecosystemTags(token: TrendingToken): string[] {
  const tags: string[] = [];
  const chain = token.chainId.toLowerCase();
  if (chain === "base") tags.push("Base ecosystem");
  if (chain === "solana") tags.push("Solana consumer");
  if (chain === "arbitrum" || chain === "ethereum") tags.push("ETH L2 / DeFi");
  const sym = token.symbol.toLowerCase();
  if (/ai|agent|virtual|render/i.test(sym + token.name)) tags.push("AI infra");
  if (/eth|btc|restake|lsd/i.test(sym)) tags.push("Restaking / LSD");
  if (/usdc|usd|dai|stable/i.test(sym)) tags.push("Stablecoin infra");
  return tags.slice(0, 3);
}

function narrativeAcceleration(
  token: TrendingToken,
  news: CryptoNewsItem[],
  community: CommunityPulse,
  geckoTrending: boolean,
): { score: number; summary: string } {
  const memeHits = community.items.filter((i) => i.kind === "meme").length;
  const redditHits = community.items.filter((i) => i.kind === "reddit").length;
  const telegramHits = community.items.filter((i) => i.kind === "telegram").length;
  const discordHits = community.items.filter((i) => i.kind === "discord").length;
  const twitterHits = community.items.filter((i) => i.kind === "twitter").length;
  const stocktwitsHits = community.items.filter((i) => i.kind === "stocktwits").length;
  const newsHits = news.length;
  const turnover = token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;
  const buyPressure =
    (token.txns24h?.buys ?? 0) / Math.max(1, token.txns24h?.sells ?? 1);

  let score = 0;
  score += Math.min(25, newsHits * 5);
  score += Math.min(20, memeHits * 8);
  score += Math.min(20, redditHits * 10);
  score += Math.min(15, telegramHits * 8);
  score += Math.min(15, discordHits * 8);
  score += Math.min(12, twitterHits * 6);
  score += Math.min(10, stocktwitsHits * 5);
  if (geckoTrending) score += 18;
  if (turnover > 0.8 && turnover < 6) score += 12;
  if (buyPressure > 1.15) score += 10;
  if (token.change24h > 6 && token.change24h < 70) score += 8;

  score = Math.min(100, score);

  const parts: string[] = [];
  if (geckoTrending) parts.push("GeckoTerminal trending");
  if (memeHits > 0) parts.push(`meme/news velocity (${memeHits} headlines)`);
  if (redditHits > 0) parts.push(`Reddit buzz (${redditHits} posts)`);
  if (telegramHits > 0) parts.push(`Telegram velocity (${telegramHits})`);
  if (discordHits > 0) parts.push(`Discord chatter (${discordHits})`);
  if (twitterHits > 0) parts.push(`X/RapidAPI mentions (${twitterHits})`);
  if (stocktwitsHits > 0) parts.push(`Stocktwits news (${stocktwitsHits})`);
  if (newsHits > 0) parts.push(`${newsHits} news hits`);
  if (turnover > 1.2) parts.push(`liquidity turnover ${turnover.toFixed(1)}×`);
  if (buyPressure > 1.2) parts.push("buy-heavy flow");

  const summary =
    parts.length > 0
      ? `Narrative acceleration: ${parts.join(" · ")}.`
      : "Narrative still quiet — no strong community acceleration yet.";

  return { score, summary };
}

function smartMoneyLine(intel: TokenIntel, token: TrendingToken): string {
  const whales = intel.whaleCount;
  const holders = intel.holderCount;
  const buys = intel.buy24h ?? token.txns24h?.buys;
  const sells = intel.sell24h ?? token.txns24h?.sells;
  const top10 = intel.top10HolderPercent;

  const parts: string[] = [];
  if (whales != null && whales > 0) parts.push(`${whales} whale-sized wallets tracked`);
  if (buys != null && sells != null && buys > sells) {
    parts.push(`${buys} buys vs ${sells} sells (24h)`);
  }
  if (top10 != null && top10 < 35) parts.push(`top-10 hold ${top10.toFixed(0)}% (healthier spread)`);
  else if (top10 != null && top10 > 55) parts.push(`top-10 concentration ${top10.toFixed(0)}% (risk)`);

  return parts.length > 0
    ? parts.join(" · ")
    : "Smart-money data limited — enable Birdeye for whale tracking.";
}

function momentumHealth(token: TrendingToken, intel: TokenIntel): string {
  const ta = intel.technical;
  const turnover = token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;
  const ch = token.change24h;

  if (ch > 120) return "Hype exhaustion risk — 24h move very extended; momentum may fade.";
  if (ch < -25) return "Negative momentum — distribution or rug pattern possible.";
  if (ta?.rsi != null && ta.rsi > 72) return `Overbought RSI ${ta.rsi.toFixed(0)} — continuation less probable.`;
  if (turnover > 10) return `Extreme turnover ${turnover.toFixed(1)}× — volatile, may not sustain.`;
  if (ta?.trend === "uptrend" && ch > 4 && ch < 60) {
    return `Sustainable momentum — uptrend, RSI ${ta.rsi?.toFixed(0) ?? "—"}, 24h ${ch.toFixed(1)}%.`;
  }
  return ta
    ? `Mixed momentum — TA score ${ta.score}/100, ${ta.trend.replace("_", " ")}.`
    : "Momentum inferred from Dex price action only.";
}

function riskBreakdown(
  token: TrendingToken,
  intel: TokenIntel,
  signal: AgentSignal,
  scam: ReturnType<typeof assessTokenScam>,
): { total: number; breakdown: AlphaRiskBreakdown } {
  let rug = 0;
  let liquidity = 0;
  let concentration = 0;
  let hypeExhaustion = 0;

  if (scam.isScam) rug = Math.min(100, scam.severity);
  if ((intel.sniperCount ?? 0) > 4) rug += 25;
  if (token.liquidityUsd < 30_000) liquidity = 85;
  else if (token.liquidityUsd < 80_000) liquidity = 45;
  if ((intel.top10HolderPercent ?? 0) > 50) concentration = 70;
  else if ((intel.top10HolderPercent ?? 0) > 38) concentration = 40;
  if (token.change24h > 100) hypeExhaustion = 75;
  else if (token.change24h > 60) hypeExhaustion = 40;

  const total = Math.min(
    100,
    Math.round(
      signal.riskScore * 0.45 +
        rug * 0.25 +
        liquidity * 0.15 +
        concentration * 0.1 +
        hypeExhaustion * 0.05,
    ),
  );

  return {
    total,
    breakdown: {
      rug: Math.min(100, rug),
      liquidity: Math.min(100, liquidity),
      concentration: Math.min(100, concentration),
      hypeExhaustion: Math.min(100, hypeExhaustion),
    },
  };
}

export async function buildAlphaIntelReport(input: {
  token: TrendingToken;
  intel: TokenIntel;
  signal: AgentSignal;
  news: CryptoNewsItem[];
  community: CommunityPulse;
  geckoTrending?: boolean;
  security?: TokenSecurityReport;
  skipGithub?: boolean;
}): Promise<AlphaIntelReport> {
  const { token, intel, signal, news, community, geckoTrending } = input;
  const scam = assessTokenScam(token, intel, input.security);
  const narrative = narrativeAcceleration(token, news, community, Boolean(geckoTrending));
  const risk = riskBreakdown(token, intel, signal, scam);
  const tags = ecosystemTags(token);

  const githubDev = input.skipGithub
    ? null
    : await fetchGithubDevSignal(token.symbol, tags[0]?.replace(" ecosystem", ""));

  let alphaScore = Math.round(
    narrative.score * 0.35 +
      signal.confidence * 0.2 +
      (intel.technical?.score ?? 50) * 0.15 +
      (signal.action === "BUY" ? 15 : signal.action === "HOLD" ? 5 : 0) -
      risk.total * 0.25 +
      (githubDev?.score ?? 0) * 0.05,
  );
  alphaScore = Math.min(100, Math.max(0, alphaScore));

  const comparable =
    narrative.score >= 60 && risk.total < 45
      ? " Pattern resembles early ecosystem rotations (rising discourse + liquidity before mainstream move)."
      : "";

  const aiThesis =
    signal.action === "SELL" || scam.isScam
      ? `Bearish / avoid — ${scam.label ?? signal.whyAction} Risk ${risk.total}/100.`
      : `${signal.whyAction} ${narrative.summary}${comparable} Confidence ${signal.confidence}%, continuation probability weighted by narrative + flow.`;

  const layerHints = [
    "Narrative acceleration (news, meme, Reddit, Telegram, Discord, X, Stocktwits, Gecko)",
    "Smart money (Birdeye whales, buy/sell flow)",
    "Momentum (TA + 24h structure)",
    "Risk (rug, liq, concentration, hype)",
    "AI thesis (Groq/heuristic)",
    ...(githubDev && githubDev.score > 20 ? ["GitHub dev momentum"] : []),
  ];

  return {
    alphaScore,
    narrativeAcceleration: narrative.score,
    narrativeSummary: narrative.summary,
    smartMoneySignal: smartMoneyLine(intel, token),
    momentumHealth: momentumHealth(token, intel),
    riskScore: risk.total,
    riskBreakdown: risk.breakdown,
    aiThesis: aiThesis.trim(),
    ecosystemTags: tags,
    githubDev,
    layerHints,
  };
}
