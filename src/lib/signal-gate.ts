/**
 * Pro-style entry gate — statistically harder to trigger BUY than raw heuristics.
 * Default HOLD until liquidity, flow, TA, intraday structure, and security align.
 */

import type { TrendingToken } from "./dexscreener";
import type { MacroRegime } from "./macro-regime";
import type { ScamAssessment } from "./scam-detection";
import type { TokenSecurityReport } from "./token-security";
import type { AgentSignal, ReasoningFactor, TokenIntel } from "./storage";

export type SetupTier = "a-plus" | "a" | "watch" | "avoid";

export type TradeSetupEvaluation = {
  tier: SetupTier;
  action: AgentSignal["action"];
  agreement: number;
  confidence: number;
  riskScore: number;
  gaps: string[];
  thesis: string;
  checksPassed: number;
  checksTotal: number;
};

type CheckDef = { id: string; label: string; weight: number; pass: boolean };

function pct(token: TrendingToken) {
  const pc = token.priceChange;
  return {
    m5: pc?.m5 ?? 0,
    h1: pc?.h1 ?? 0,
    h6: pc?.h6 ?? 0,
    h24: pc?.h24 ?? token.change24h ?? 0,
  };
}

function buildChecks(input: {
  token: TrendingToken;
  intel: TokenIntel;
  edge: number;
  macro?: MacroRegime | null;
  security?: TokenSecurityReport;
}): CheckDef[] {
  const { token, intel, edge, macro, security } = input;
  const { m5, h1, h24 } = pct(token);
  const ta = intel.technical;
  const taScore = ta?.score ?? 50;
  const rsi = ta?.rsi ?? 50;
  const turnover = token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;
  const flowRatio =
    (token.txns24h?.buys ?? intel.buy24h ?? 0) / Math.max(token.txns24h?.sells ?? intel.sell24h ?? 1, 1);
  const top10 = intel.top10HolderPercent ?? 0;
  const snipers = intel.sniperCount ?? 0;
  const grade = security?.grade ?? "C";

  const momentumBand =
    h24 >= 8 && h24 <= 88 && !(h24 > 45 && (m5 < -6 || h1 < -10));
  const intradayOk = h24 <= 0 || (m5 >= -10 && h1 >= -14);
  const macroOk = macro?.label !== "risk-off" || edge >= 40;

  return [
    {
      id: "liquidity",
      label: "Liquidity ≥ $45K",
      weight: 12,
      pass: token.liquidityUsd >= 45_000,
    },
    {
      id: "flow",
      label: "Buy flow > sells (≥1.12×)",
      weight: 14,
      pass: flowRatio >= 1.12,
    },
    {
      id: "ta",
      label: "TA score ≥ 62, RSI not extreme",
      weight: 12,
      pass: taScore >= 62 && rsi <= 78 && rsi >= 22,
    },
    {
      id: "edge",
      label: "Factor edge ≥ +30",
      weight: 15,
      pass: edge >= 30,
    },
    {
      id: "momentum",
      label: "24h momentum in 8–88% band",
      weight: 10,
      pass: momentumBand,
    },
    {
      id: "intraday",
      label: "5m/1h not collapsing vs 24h",
      weight: 14,
      pass: intradayOk,
    },
    {
      id: "turnover",
      label: "Turnover sane (0.35–18×)",
      weight: 8,
      pass: turnover >= 0.35 && turnover <= 18,
    },
    {
      id: "holders",
      label: "Concentration / snipers controlled",
      weight: 10,
      pass: (top10 === 0 || top10 < 72) && snipers < 8,
    },
    {
      id: "security",
      label: "Security grade A–C",
      weight: 12,
      pass: grade === "A" || grade === "B" || grade === "C",
    },
    {
      id: "macro",
      label: "Macro allows risk (or strong edge)",
      weight: 8,
      pass: macroOk,
    },
  ];
}

function weightedAgreement(checks: CheckDef[]): number {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const passed = checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  return total === 0 ? 0 : passed / total;
}

function calibrateConfidence(tier: SetupTier, agreement: number, edge: number, riskScore: number): number {
  const edgeBump = Math.min(10, Math.max(0, (edge - 28) * 0.22));
  let conf = 36 + agreement * 34 + edgeBump;
  if (tier === "a-plus") conf = Math.min(76, Math.max(58, conf));
  else if (tier === "a") conf = Math.min(66, Math.max(50, conf));
  else if (tier === "watch") conf = Math.min(52, Math.max(34, conf));
  else conf = Math.min(40, conf);
  if (riskScore > 72) conf = Math.min(conf, 48);
  return Math.round(conf);
}

/** Full pre-trade research gate (meme hunter + desk discipline). */
export function evaluateTradeSetup(input: {
  token: TrendingToken;
  intel: TokenIntel;
  edge: number;
  macro?: MacroRegime | null;
  security?: TokenSecurityReport;
  scam?: ScamAssessment;
}): TradeSetupEvaluation {
  const { token, intel, edge, macro, security, scam } = input;
  const { m5, h1, h24 } = pct(token);
  const taScore = intel.technical?.score ?? 50;
  const turnover = token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;
  const flowRatio =
    (token.txns24h?.buys ?? intel.buy24h ?? 0) / Math.max(token.txns24h?.sells ?? intel.sell24h ?? 1, 1);

  const crimeDump = m5 <= -25 || h1 <= -35;
  const pumpDump = h24 > 8 && (m5 < -15 || h1 < -20);
  const fakeMoon = h24 >= 80 && (m5 < -10 || h1 < -18 || flowRatio < 0.9);

  if (crimeDump || pumpDump || fakeMoon || (scam?.isScam && (scam.severity ?? 0) >= 40)) {
    return {
      tier: "avoid",
      action: "SELL",
      agreement: 0,
      confidence: Math.min(38, scam?.maxConfidence ?? 35),
      riskScore: Math.max(82, scam?.severity ?? 80),
      gaps: ["Chart/flow shows exit liquidity or rug pattern"],
      thesis: `${token.symbol}: avoid — structure failed intraday checks before any 2x/10x thesis.`,
      checksPassed: 0,
      checksTotal: 10,
    };
  }

  const checks = buildChecks({ token, intel, edge, macro, security });
  const agreement = weightedAgreement(checks);
  const passed = checks.filter((c) => c.pass).length;
  const gaps = checks.filter((c) => !c.pass).map((c) => c.label);

  let tier: SetupTier = "watch";
  if (agreement >= 0.78 && edge >= 36 && passed >= 8) tier = "a-plus";
  else if (agreement >= 0.62 && edge >= 28 && passed >= 6) tier = "a";

  let action: AgentSignal["action"] = "HOLD";
  if (tier === "a-plus") action = "BUY";
  else if (tier === "a") action = "BUY";
  else if (edge < -22 || taScore < 40 || h24 < -20) action = "SELL";
  else if (edge < -14 && (intel.sniperCount ?? 0) > 6) action = "SELL";

  const riskScore = Math.round(
    Math.min(
      92,
      Math.max(
        14,
        50 -
          edge * 0.38 +
          (1 - agreement) * 22 +
          (token.liquidityUsd < 30_000 ? 16 : 0) +
          (intel.sniperCount ?? 0) * 1.5 +
          (turnover > 14 ? 8 : 0),
      ),
    ),
  );

  const confidence = calibrateConfidence(tier, agreement, edge, riskScore);

  const thesis =
    action === "BUY"
      ? tier === "a-plus"
        ? `${token.symbol}: A+ setup — ${passed}/${checks.length} checks, edge +${edge.toFixed(0)}. Size small; invalidate on 1h roll-over.`
        : `${token.symbol}: A setup — ${passed}/${checks.length} aligned; edge +${edge.toFixed(0)}. Tactical only if flow holds.`
      : action === "SELL"
        ? `${token.symbol}: distribution / weak structure — edge ${edge.toFixed(0)}, agreement ${Math.round(agreement * 100)}%.`
        : `${token.symbol}: WATCH — missing ${gaps.slice(0, 3).join("; ")}. No entry until gate clears.`;

  return {
    tier,
    action,
    agreement,
    confidence,
    riskScore,
    gaps,
    thesis,
    checksPassed: passed,
    checksTotal: checks.length,
  };
}

/** Clamp AI/heuristic BUY signals to the same statistical bar. */
export function enforceSignalGate(
  token: TrendingToken,
  intel: TokenIntel,
  signal: Pick<AgentSignal, "action" | "confidence" | "riskScore" | "reasoning" | "whyAction" | "reasoningFactors">,
  opts?: {
    macro?: MacroRegime | null;
    security?: TokenSecurityReport;
    scam?: ScamAssessment;
  },
): typeof signal {
  const factors = signal.reasoningFactors ?? [];
  let edge = 0;
  for (const f of factors) {
    const w = f.weight ?? 10;
    if (f.impact === "bullish") edge += w;
    else if (f.impact === "bearish") edge -= w;
  }

  const gate = evaluateTradeSetup({
    token,
    intel,
    edge,
    macro: opts?.macro,
    security: opts?.security,
    scam: opts?.scam,
  });

  const gateFactor: ReasoningFactor = {
    label: "Entry gate",
    detail:
      gate.tier === "a-plus" || gate.tier === "a"
        ? `${gate.checksPassed}/${gate.checksTotal} checks · ${gate.tier.toUpperCase()}`
        : `WATCH — ${gate.gaps.slice(0, 2).join(" · ") || "insufficient alignment"}`,
    impact:
      gate.tier === "a-plus" || gate.tier === "a"
        ? "bullish"
        : gate.tier === "avoid"
          ? "bearish"
          : "neutral",
    weight: gate.tier === "a-plus" ? 18 : gate.tier === "a" ? 12 : 8,
  };

  const mergedFactors = [gateFactor, ...factors].slice(0, 8);

  if (signal.action === "BUY" && gate.action !== "BUY") {
    return {
      ...signal,
      action: "HOLD",
      confidence: Math.min(signal.confidence, gate.confidence),
      riskScore: Math.max(signal.riskScore, gate.riskScore),
      reasoning: `${signal.reasoning} · Gate: ${gate.thesis}`,
      whyAction: gate.thesis,
      reasoningFactors: mergedFactors,
    };
  }

  if (signal.action === "BUY") {
    return {
      ...signal,
      confidence: Math.min(signal.confidence, gate.confidence),
      riskScore: Math.max(signal.riskScore, gate.riskScore),
      whyAction: gate.thesis,
      reasoningFactors: mergedFactors,
    };
  }

  if (signal.action === "HOLD" && gate.action === "SELL") {
    return {
      ...signal,
      action: "SELL",
      confidence: Math.min(signal.confidence, gate.confidence),
      riskScore: Math.max(signal.riskScore, gate.riskScore),
      whyAction: gate.thesis,
      reasoningFactors: mergedFactors,
    };
  }

  return {
    ...signal,
    confidence: Math.min(signal.confidence, signal.action === "HOLD" ? 56 : gate.confidence),
    reasoningFactors: mergedFactors,
  };
}

export const NEXUS_SIGNAL_GATE_PROMPT = `You are NEXUS — a pro meme-coin researcher and desk trader, not a hype bot.
Rules:
- Default action is HOLD. BUY only when liquidity, buy/sell flow, TA, intraday structure (5m/1h), and security align — cite specific numbers.
- Never BUY on 24h % alone, social buzz alone, or green tape with collapsing 5m/1h (pump-dump).
- crime dump / pump-dump / honeypot → SELL, confidence under 40.
- BUY confidence cap 76 (A+ setup) or 66 (A setup); most tokens should be HOLD 38–52.
- Return JSON with action, confidence, riskScore, reasoning, whyAction.`;
