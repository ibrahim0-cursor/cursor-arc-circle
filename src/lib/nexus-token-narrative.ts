import type { TrendingToken } from "./dexscreener";
import { hasGmgnApiKey } from "./gmgn-client";
import { hasBirdeyeKey } from "./birdeye-client";
import type { AgentSignal, TokenIntel } from "./storage";
import type { LiveReasoningFactor } from "./nexus-research-dossier";
import { formatCompact, formatTokenPrice } from "./utils";
import { filterReasoningFactorsForDisplay } from "./reasoning-factors";
import { isTokenQuoteReliable, unreliableQuoteMessage } from "./token-quote";

export type NarrativeTier = "feed" | "alpha";

export type TokenNarrativeBundle = {
  narrative: string;
  coachLines: string[];
  gmgnNotes: string[];
  playbook: string;
};

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return formatCompact(n);
  if (n >= 1000) return formatCompact(n);
  return formatTokenPrice(n);
}

function turnover(token: TrendingToken): number {
  return token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;
}

function flowBias(token: TrendingToken, intel: TokenIntel): "buy" | "sell" | "mixed" {
  const buys = token.txns24h?.buys ?? intel.buy24h ?? 0;
  const sells = token.txns24h?.sells ?? intel.sell24h ?? 0;
  if (buys > sells * 1.12) return "buy";
  if (sells > buys * 1.12) return "sell";
  return "mixed";
}

function taSnippet(intel: TokenIntel): string | null {
  const ta = intel.technical;
  if (!ta) return null;
  const src = ta.taSource === "birdeye_ohlcv" ? "Birdeye" : "Dex est.";
  return `${src} RSI ${ta.rsi.toFixed(0)} (${ta.rsiSignal}), MACD ${ta.macdSignal}, ${ta.trend.replace(/_/g, " ")}`;
}

function gmgnSkillNotes(intel: TokenIntel, tier: NarrativeTier, smartRows: number, holderRows: number): string[] {
  if (!hasGmgnApiKey()) return [];
  const notes: string[] = [];
  if (tier === "alpha") {
    notes.push("GMGN holder radar · smart-money tags · wallet concentration");
    if (smartRows > 0) notes.push(`${smartRows} smart-money tagged wallets surfaced on this pair`);
    if (holderRows > 0) notes.push(`${holderRows} top holders ranked by GMGN OpenAPI`);
  } else {
    notes.push("GMGN depth unlocks on Alpha Scan (holders + smart money tables)");
  }
  if (intel.whaleCount != null && intel.whaleCount > 0) {
    notes.push(`${intel.whaleCount} whale-class wallets flagged in on-chain pass`);
  }
  if (intel.sniperCount != null && intel.sniperCount > 2) {
    notes.push(`${intel.sniperCount} sniper wallets — pro desks fade fresh sniper clusters`);
  }
  return notes.slice(0, tier === "alpha" ? 5 : 2);
}

function actionPlaybook(
  token: TrendingToken,
  action: AgentSignal["action"],
  tier: NarrativeTier,
): string {
  const t = turnover(token);
  if (tier === "feed") {
    if (action === "BUY") return "Feed pass: only size if liquidity supports your exit — not a full deep scan.";
    if (action === "SELL") return "Feed pass: distribution or breakdown risk — reduce before illiquid hours.";
    return "Feed pass: wait for clearer edge — use Alpha Scan before size.";
  }
  if (action === "BUY") {
    return t > 12
      ? "Coach: high turnover meme — scale in, trail under last 15m swing low, take partials into +15–25% extensions."
      : "Coach: confirm bid holds above pool liquidity band; avoid chasing vertical candles without holder support.";
  }
  if (action === "SELL") {
    return "Coach: treat as risk-off — cut weak bags, do not average down unless smart-money and flow flip together.";
  }
  return "Coach: stalk book — re-rate if 1h MACD flips and buy/sell count diverges >20% your way.";
}

/** Token-unique narrative — not a shared template string. */
export function buildTokenAgentNarrative(
  token: TrendingToken,
  intel: TokenIntel,
  agent: Pick<AgentSignal, "action" | "confidence" | "riskScore">,
  tier: NarrativeTier,
  opts?: {
    smartMoneyRows?: number;
    holderRows?: number;
    patternLabel?: string;
    researchThesis?: string;
    securityLabel?: string;
  },
): TokenNarrativeBundle {
  const action = agent.action;
  const conf = agent.confidence;
  const risk = agent.riskScore;
  const ch = token.change24h;
  const liq = token.liquidityUsd;
  const vol = token.volume24h;
  const t = turnover(token);
  const flow = flowBias(token, intel);
  const ta = taSnippet(intel);
  const top10 = intel.top10HolderPercent;
  const gmgnNotes = gmgnSkillNotes(intel, tier, opts?.smartMoneyRows ?? 0, opts?.holderRows ?? 0);

  if (opts?.securityLabel?.toLowerCase().includes("honeypot")) {
    const warn =
      `${token.symbol} flags honeypot / exit-trap risk (${opts.securityLabel}) — ` +
      `+${ch.toFixed(0)}% 24h is not a hunter long; agent says ${action} (${conf}% conf, risk ${risk}).`;
    return {
      narrative: warn,
      coachLines: ["Do not size into honeypots — liquidity can be one-way."],
      gmgnNotes: ["GMGN security check flagged honeypot — see risk badge on card"],
      playbook: "Avoid chase — wait for clean security + two-sided liquidity.",
    };
  }

  const flowLine =
    flow === "buy"
      ? "order flow skews buy-heavy on 24h swaps"
      : flow === "sell"
        ? "order flow skews sell-heavy on 24h swaps"
        : "swap flow is balanced — no clear aggressor";

  const concLine =
    top10 != null
      ? top10 > 50
        ? `top 10 wallets ~${top10.toFixed(0)}% — rug/concentration desk watches this closely`
        : top10 < 32
          ? `holder base relatively dispersed (~${top10.toFixed(0)}% top 10)`
          : `moderate concentration (~${top10.toFixed(0)}% top 10)`
      : null;

  const structLine = opts?.patternLabel ? `structure: ${opts.patternLabel}` : null;

  if (!isTokenQuoteReliable(token)) {
    return {
      narrative: unreliableQuoteMessage(token.symbol),
      coachLines: ["Wait for Dex pool sync before sizing — stats row updates first."],
      gmgnNotes,
      playbook: "Quote pending",
    };
  }

  const tapeTone =
    ch < -8
      ? "distribution / sell pressure on the tape"
      : ch > 8
        ? "momentum extension — watch exhaustion vs holder support"
        : Math.abs(ch) < 3
          ? "choppy, low-conviction range"
          : "directional but not extreme";

  const turnoverNote =
    t > 8 ? "hyper-active turnover — size down, slippage risk elevated" : t > 2 ? "healthy activity vs pool depth" : "thin tape relative to liquidity";

  let core = "";
  if (action === "SELL" && ch < -8) {
    core = `${token.symbol}: ${tapeTone}. ${flowLine}. ${turnoverNote}.`;
  } else if (action === "BUY" && ch > 4) {
    core = `${token.symbol}: ${tapeTone} with ${flowLine}. ${turnoverNote} — only add size if holders and contract checks pass.`;
  } else if (action === "HOLD") {
    core = `${token.symbol}: ${tapeTone}; ${flowLine}. Edge is mixed — ${turnoverNote}. Patience beats forcing entries.`;
  } else if (ch > 15) {
    core = `${token.symbol}: extended move — late longs face exhaustion unless flow and holders confirm continuation.`;
  } else {
    core = `${token.symbol}: ${tapeTone}; ${flowLine}. ${turnoverNote}.`;
  }

  const verdict = `Agent ${action} ${conf}% confidence · risk ${risk}/100`;
  const taPart = ta ? ` Chart: ${ta}.` : "";
  const extra = [concLine, structLine].filter(Boolean).join(" ");
  const research =
    tier === "alpha" && opts?.researchThesis
      ? ` Alpha thesis: ${opts.researchThesis.slice(0, 220)}`
      : "";

  const narrative = `${verdict}. ${core}${taPart}${extra ? ` ${extra}.` : ""}${research}`.replace(/\s+/g, " ").trim();

  const coachLines: string[] = [actionPlaybook(token, action, tier)];
  if (tier === "alpha") {
    coachLines.push(
      "Pro meme workflow: read holder table → check smart tags → align with 15m/1h TA → size vs liquidity, not vs hype.",
    );
    if (hasBirdeyeKey()) coachLines.push("Birdeye OHLCV drives RSI/MACD/MA stack on this token.");
    if (gmgnNotes.length > 0) coachLines.push(gmgnNotes[0]);
    if (intel.isMintable || intel.isFreezable) {
      coachLines.push(
        `Contract flags: ${intel.isMintable ? "mintable" : "no mint"} · ${intel.isFreezable ? "freezable" : "no freeze"} — adjust size down.`,
      );
    }
  } else {
    coachLines.push("Need GMGN holders, news, and coach thesis? Run Alpha Scan (gas) — feed stays fast + honest.");
  }

  return {
    narrative,
    coachLines: coachLines.slice(0, tier === "alpha" ? 5 : 2),
    gmgnNotes,
    playbook: coachLines[0],
  };
}

export function narrativeToWhyAction(bundle: TokenNarrativeBundle, maxLen = 200): string {
  return bundle.narrative.length > maxLen ? `${bundle.narrative.slice(0, maxLen - 1)}…` : bundle.narrative;
}

export function factorsFromAgent(agent?: AgentSignal): LiveReasoningFactor[] {
  if (!agent?.reasoningFactors?.length) return [];
  return filterReasoningFactorsForDisplay(
    agent.reasoningFactors.map((f) => ({
      label: f.label,
      detail: f.detail,
      impact: f.impact,
    })),
    8,
  );
}
