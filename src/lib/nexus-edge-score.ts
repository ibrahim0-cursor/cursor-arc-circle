/**
 * Wallet-first NEXUS Edge Score — DexScreener market structure + on-chain holders + security + narrative.
 * TA (RSI/MACD) is a small reference only, not primary alpha.
 */

import type { TrendingToken } from "./dexscreener";
import { computeDexMarketMetrics } from "./dexscreener-market";
import type { ReasoningFactor, TokenIntel } from "./storage";
import type { TokenSecurityReport } from "./token-security";
import type { ScamAssessment } from "./scam-detection";
import type { MacroRegime } from "./macro-regime";
import { macroRegimeGuidance } from "./macro-regime";

export type NexusEdgeBreakdown = {
  edge: number;
  score: number;
  components: {
    marketStructure: number;
    walletIntel: number;
    liquidityGrowth: number;
    narrative: number;
    security: number;
    taReference: number;
  };
  factors: ReasoningFactor[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function enrichIntelFromHolders(
  intel: TokenIntel,
  holders: Array<{ pct: number; label?: string }>,
): TokenIntel {
  if (!holders.length) return intel;
  const top10 = holders.slice(0, 10).reduce((s, h) => s + (h.pct > 1 ? h.pct : h.pct * 100), 0);
  const whales = holders.filter(
    (h) => h.pct >= 2 || /whale|top holder/i.test(h.label ?? ""),
  ).length;
  return {
    ...intel,
    top10HolderPercent: top10 > 0 ? Math.min(100, top10) : intel.top10HolderPercent,
    whaleCount: whales > 0 ? whales : intel.whaleCount,
    holderCount: intel.holderCount,
  };
}

export function computeNexusEdgeScore(input: {
  token: TrendingToken;
  intel: TokenIntel;
  macro?: MacroRegime | null;
  security?: TokenSecurityReport;
  scam?: ScamAssessment;
}): NexusEdgeBreakdown {
  const { token, intel, macro, security, scam } = input;
  const factors: ReasoningFactor[] = [];
  const m = computeDexMarketMetrics(token);

  let marketStructure = 0;
  let walletIntel = 0;
  let liquidityGrowth = 0;
  let narrative = 0;
  let securityScore = 0;
  let taReference = 0;

  // --- 1. DexScreener market structure (primary) ---
  if (m.liquidityUsd >= 45_000) {
    marketStructure += 12;
    factors.push({
      label: "Liquidity (Dex)",
      detail: `$${(m.liquidityUsd / 1000).toFixed(0)}K pool depth`,
      impact: "bullish",
      weight: 12,
    });
  } else if (m.liquidityUsd < 15_000) {
    marketStructure -= 14;
    factors.push({
      label: "Liquidity (Dex)",
      detail: `Thin $${(m.liquidityUsd / 1000).toFixed(1)}K — exit risk`,
      impact: "bearish",
      weight: 14,
    });
  }

  if (m.flow.impact !== "neutral") {
    const w = m.flow.ratio >= 1.25 ? 18 : m.flow.ratio <= 0.75 ? -16 : m.flow.impact === "bullish" ? 10 : -10;
    marketStructure += w;
    factors.push({
      label: "Flow skew (Dex txns)",
      detail: m.flow.label,
      impact: m.flow.impact,
      weight: Math.abs(w),
    });
  }

  if (m.volume24h >= 20_000 && m.turnover >= 0.35 && m.turnover <= 18) {
    marketStructure += 8;
    factors.push({
      label: "Volume / turnover",
      detail: `$${(m.volume24h / 1000).toFixed(0)}K vol · ${m.turnover.toFixed(1)}× vs liq`,
      impact: "bullish",
      weight: 8,
    });
  }

  const h24 = m.change24h;
  if (h24 >= 5 && h24 <= 75) {
    marketStructure += 6;
  } else if (h24 < -25) {
    marketStructure -= 10;
    factors.push({
      label: "24h price",
      detail: `${h24.toFixed(1)}% — distribution tape`,
      impact: "bearish",
      weight: 10,
    });
  }

  if (m.pairAgeHours != null && m.pairAgeHours < 72) {
    liquidityGrowth += 6;
    factors.push({
      label: "Pair age",
      detail: `~${m.pairAgeHours.toFixed(0)}h on Dex — fresh launch window`,
      impact: "bullish",
      weight: 6,
    });
  }

  // --- 2. Wallet intelligence (Moralis / Blockscout / GMGN cascade) ---
  const holders = intel.holderCount ?? 0;
  const top10 = intel.top10HolderPercent ?? 0;
  const whales = intel.whaleCount ?? 0;
  const snipers = intel.sniperCount ?? 0;

  if (holders >= 500) {
    walletIntel += 14;
    factors.push({
      label: "Holder base",
      detail: `${holders.toLocaleString()} holders — distribution improving`,
      impact: "bullish",
      weight: 14,
    });
  } else if (holders > 0 && holders < 80) {
    walletIntel -= 12;
    factors.push({
      label: "Holder base",
      detail: `Only ${holders} holders — thin wallet graph`,
      impact: "bearish",
      weight: 12,
    });
  }

  if (top10 > 0 && top10 < 38) {
    walletIntel += 12;
    factors.push({
      label: "Wallet quality",
      detail: `Top 10 hold ~${top10.toFixed(0)}% — healthier spread`,
      impact: "bullish",
      weight: 12,
    });
  } else if (top10 >= 72) {
    walletIntel -= 18;
    factors.push({
      label: "Whale concentration",
      detail: `Top 10 ~${top10.toFixed(0)}% — exit liquidity risk`,
      impact: "bearish",
      weight: 18,
    });
  }

  if (whales >= 3 && m.flow.ratio >= 1.08) {
    walletIntel += 10;
    factors.push({
      label: "Whale accumulation",
      detail: `${whales} large wallets + buy-skewed Dex flow`,
      impact: "bullish",
      weight: 10,
    });
  }

  if (snipers > 8) {
    walletIntel -= 14;
    factors.push({
      label: "Sniper wallets",
      detail: `${snipers} snipers — distribution headwind`,
      impact: "bearish",
      weight: 14,
    });
  }

  // --- 3. Liquidity growth proxy ---
  if (m.liquidityUsd >= 100_000 && m.volume24h > m.liquidityUsd * 0.5) {
    liquidityGrowth += 8;
    factors.push({
      label: "Liquidity growth",
      detail: "Deep pool + active turnover — structure strengthening",
      impact: "bullish",
      weight: 8,
    });
  }

  // --- 4. Narrative (Reddit / social) ---
  const rd = intel.social?.reddit;
  if (rd?.postCount && rd.postCount > 0) {
    narrative += 10;
    factors.push({
      label: "Narrative (Reddit)",
      detail: `r/${rd.subreddit ?? "crypto"}: ${(rd.topTitle ?? "").slice(0, 80)}`,
      impact: "bullish",
      weight: 10,
    });
  }
  const lc = intel.social?.lunarcrush;
  if (lc?.galaxyScore != null && lc.galaxyScore >= 60 && !lc.degraded) {
    narrative += 8;
    factors.push({
      label: "Narrative acceleration",
      detail: `Galaxy ${lc.galaxyScore}${lc.socialVolume24h ? ` · vol ${lc.socialVolume24h}` : ""}`,
      impact: "bullish",
      weight: 8,
    });
  }

  // --- 5. Security (GoPlus / honeypot / local) ---
  if (security?.honeypotRisk || scam?.scamType === "honeypot") {
    securityScore -= 55;
    factors.push({
      label: "Security (GoPlus / honeypot)",
      detail: security?.flags?.[0] ?? scam?.flags?.[0] ?? "Honeypot risk",
      impact: "bearish",
      weight: 55,
    });
  } else if (security?.grade === "A" || security?.grade === "B") {
    securityScore += 10;
    factors.push({
      label: "Security check",
      detail: `${security.grade} — ${security.label}`,
      impact: "bullish",
      weight: 10,
    });
  } else if (security?.grade === "D" || security?.grade === "F") {
    securityScore -= 20;
    factors.push({
      label: "Security check",
      detail: security.flags.slice(0, 2).join(" · ") || security.label,
      impact: "bearish",
      weight: 20,
    });
  }

  if (intel.isMintable || intel.isFreezable) {
    securityScore -= 16;
    factors.push({
      label: "Contract risk",
      detail: `${intel.isMintable ? "Mintable" : ""} ${intel.isFreezable ? "Freezable" : ""}`.trim(),
      impact: "bearish",
      weight: 16,
    });
  }

  // --- 6. TA reference only (low weight) ---
  const ta = intel.technical;
  if (ta) {
    const taBull =
      ta.trend.includes("up") || ta.macdSignal === "bullish" || ta.rsiSignal === "oversold";
    const taBear =
      ta.trend.includes("down") || ta.macdSignal === "bearish" || ta.rsiSignal === "overbought";
    if (taBull && !taBear) {
      taReference += 4;
      factors.push({
        label: "TA reference",
        detail: `RSI ${ta.rsi.toFixed(0)} · ${ta.trendLine} (secondary)`,
        impact: "bullish",
        weight: 4,
      });
    } else if (taBear) {
      taReference -= 4;
      factors.push({
        label: "TA reference",
        detail: `RSI ${ta.rsi.toFixed(0)} · ${ta.macdSignal} (secondary)`,
        impact: "bearish",
        weight: 4,
      });
    }
  }

  if (macro) {
    const macroBump = macro.label === "risk-on" ? 6 : macro.label === "risk-off" ? -8 : 0;
    marketStructure += macroBump;
    if (macroBump !== 0) {
      factors.push({
        label: "Macro (PRISM)",
        detail: macroRegimeGuidance(macro),
        impact: macroBump > 0 ? "bullish" : "bearish",
        weight: Math.abs(macroBump),
      });
    }
  }

  const raw =
    marketStructure + walletIntel + liquidityGrowth + narrative + securityScore + taReference;
  const edge = clamp(Math.round(raw), -100, 100);

  return {
    edge,
    score: edge,
    components: {
      marketStructure: clamp(marketStructure, -40, 40),
      walletIntel: clamp(walletIntel, -40, 40),
      liquidityGrowth: clamp(liquidityGrowth, 0, 20),
      narrative: clamp(narrative, 0, 20),
      security: clamp(securityScore, -60, 15),
      taReference: clamp(taReference, -8, 8),
    },
    factors,
  };
}

export function edgeFactorsToReasoning(factors: ReasoningFactor[], max = 8): ReasoningFactor[] {
  return [...factors]
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, max);
}
