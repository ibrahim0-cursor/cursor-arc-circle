import type { TrendingToken } from "./dexscreener";
import type { TokenIntel } from "./storage";
import type { TokenSecurityReport } from "./token-security";
import type { AgentSignal } from "./storage";

export type ScamType =
  | "rug_pull"
  | "crime_dump"
  | "honeypot"
  | "sell_pressure"
  | "micro_liquidity"
  | "pump_dump";

export type ScamAssessment = {
  isScam: boolean;
  scamType: ScamType | null;
  label: string;
  flags: string[];
  severity: number;
  recommendedAction: "SELL" | "HOLD";
  maxConfidence: number;
};

function pctChanges(token: TrendingToken) {
  const pc = token.priceChange;
  return {
    m5: pc?.m5 ?? 0,
    h1: pc?.h1 ?? 0,
    h6: pc?.h6 ?? 0,
    h24: pc?.h24 ?? token.change24h ?? 0,
  };
}

/** DexScreener-style rug / honeypot heuristics using multi-timeframe price + flow */
export function assessTokenScam(
  token: TrendingToken,
  intel?: TokenIntel,
  security?: TokenSecurityReport,
): ScamAssessment {
  const flags: string[] = [];
  let severity = 0;
  let scamType: ScamType | null = null;

  const { m5, h1, h6, h24 } = pctChanges(token);
  const turnover = token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;
  const buys = token.txns24h?.buys ?? intel?.buy24h ?? 0;
  const sells = token.txns24h?.sells ?? intel?.sell24h ?? 0;
  const sellRatio = sells / Math.max(buys, 1);

  if (m5 <= -35 || h1 <= -45) {
    severity += 45;
    scamType = "crime_dump";
    flags.push(`Crime dump: ${m5.toFixed(1)}% (5m) / ${h1.toFixed(1)}% (1h) — exit liquidity event`);
  }

  if (h24 > 8 && (m5 < -20 || h1 < -30)) {
    severity += 40;
    scamType = scamType ?? "pump_dump";
    flags.push(`Pump-then-dump: +${h24.toFixed(1)}% 24h but collapsing on 5m/1h (dev sell pattern)`);
  }

  if (h6 < -40 && h24 > 0) {
    severity += 35;
    scamType = scamType ?? "rug_pull";
    flags.push(`6h −${Math.abs(h6).toFixed(0)}% after positive 24h — classic rug shape on chart`);
  }

  if (turnover > 80 && token.liquidityUsd < 40_000) {
    severity += 25;
    flags.push(`Extreme ${turnover.toFixed(0)}× turnover vs $${(token.liquidityUsd / 1000).toFixed(0)}K liquidity — wash/rug tape`);
  }

  if (sellRatio > 2.5 && sells > 15) {
    severity += 22;
    scamType = scamType ?? "sell_pressure";
    flags.push(`Sell pressure ${sells} sells vs ${buys} buys — distribution dominates`);
  }

  if (token.liquidityUsd < 15_000 && token.volume24h > 100_000) {
    severity += 28;
    scamType = scamType ?? "micro_liquidity";
    flags.push("Micro liquidity with huge volume — likely exit scam");
  }

  if ((intel?.top10HolderPercent ?? 0) > 55) {
    severity += 18;
    flags.push(`Top 10 wallets ${intel!.top10HolderPercent!.toFixed(0)}% — dev/cluster risk`);
  }

  if ((intel?.sniperCount ?? 0) > 12) {
    severity += 20;
    flags.push(`${intel!.sniperCount} sniper wallets — launch snipe / dump setup`);
  }

  if (intel?.isMintable && intel?.isFreezable) {
    severity += 35;
    scamType = "honeypot";
    flags.push("Mintable + freezable contract — honeypot risk");
  }

  if (security?.honeypotRisk) {
    severity = Math.max(severity, 52);
    scamType = scamType ?? "honeypot";
    flags.push(security.label);
    flags.push(...(security.flags ?? []));
  }

  if (token.priceUsd > 0 && token.priceUsd < 0.000001 && token.marketCap && token.marketCap < 30_000) {
    severity += 15;
    flags.push("Near-zero price micro-cap — high scam prevalence");
  }

  severity = Math.min(100, severity);
  const isScam = severity >= 42 || scamType !== null;

  const label = !isScam
    ? "No major scam pattern detected"
    : scamType === "crime_dump"
      ? "⚠️ Crime dump — do not hold"
      : scamType === "pump_dump" || scamType === "rug_pull"
        ? "⚠️ Rug / pump-dump — avoid"
        : scamType === "honeypot"
          ? "⚠️ Honeypot risk"
          : "⚠️ High scam risk — avoid";

  const forceExit =
    isScam &&
    (severity >= 35 ||
      scamType === "crime_dump" ||
      scamType === "pump_dump" ||
      scamType === "rug_pull" ||
      scamType === "honeypot" ||
      scamType === "micro_liquidity");

  return {
    isScam,
    scamType,
    label,
    flags: [...new Set(flags)].slice(0, 6),
    severity,
    recommendedAction: forceExit ? "SELL" : "HOLD",
    /** Confidence we are right to exit/avoid (high), not a position-size hint */
    maxConfidence: isScam ? Math.min(98, Math.max(88, 52 + Math.floor(severity / 2))) : 94,
  };
}

export function applyScamAndSecurity(
  token: TrendingToken,
  intel: TokenIntel,
  signal: AgentSignal,
  security: TokenSecurityReport,
  scam: ScamAssessment,
): AgentSignal {
  if (scam.isScam) {
    const exitConf = Math.max(scam.maxConfidence, 88);
    const scamFactors: typeof signal.reasoningFactors = [
      {
        label: "Scam check",
        detail: scam.flags.join(" · ") || scam.label,
        impact: "bearish",
        weight: 50,
      },
      ...(signal.reasoningFactors ?? []).slice(0, 4),
    ];
    return {
      action: "SELL",
      confidence: exitConf,
      riskScore: Math.max(signal.riskScore, scam.severity, 88),
      reasoning: `SCAM ALERT (${scam.scamType ?? "risk"}): ${scam.flags.join("; ")}`,
      whyAction: `${token.symbol}: ${scam.label} — do not enter; exit if held. ${scam.flags[0] ?? ""}`,
      reasoningFactors: scamFactors,
      deskVerdict: "AVOID",
    };
  }

  if (security.honeypotRisk || scam.scamType === "honeypot") {
    return {
      action: "SELL",
      confidence: Math.max(90, scam.maxConfidence),
      riskScore: Math.max(signal.riskScore, 92),
      deskVerdict: "AVOID",
      reasoning: `Honeypot / exit-trap risk on ${token.symbol}: ${(security.flags ?? []).concat(scam.flags).join("; ") || security.label}. High 24h % is not a buy signal when you cannot safely sell.`,
      whyAction: `${token.symbol}: ${scam.label || security.label} — do not chase "+${token.change24h.toFixed(0)}%" tape; treat as avoid/exit, not 100x hunter setup.`,
      reasoningFactors: [
        {
          label: "Honeypot check",
          detail: scam.flags.join(" · ") || security.label,
          impact: "bearish",
          weight: 55,
        },
        ...(signal.reasoningFactors ?? []).slice(0, 3),
      ],
    };
  }

  if (security.grade === "F" || security.grade === "D") {
    return {
      ...signal,
      action: "HOLD",
      confidence: Math.min(signal.confidence, 48),
      riskScore: Math.max(signal.riskScore, 70),
      whyAction: `Risk grade ${security.grade}: ${security.flags.join(", ") || security.label}. Entry gate blocked — research only.`,
    };
  }

  if (security.grade === "C" && signal.action === "BUY") {
    return {
      ...signal,
      action: "HOLD",
      confidence: Math.min(signal.confidence, 58),
      riskScore: Math.max(signal.riskScore, 62),
      whyAction: `Grade C contract risk — wait for A/B security or stronger flow before sizing ${token.symbol}.`,
    };
  }

  return signal;
}
