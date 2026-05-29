import type { TrendingToken } from "./dexscreener";
import { hasGmgnApiKey } from "./gmgn-client";
import { hasBirdeyeKey } from "./birdeye-client";
import type { AgentSignal, ReasoningFactor, TokenIntel } from "./storage";
import type { LiveReasoningFactor } from "./nexus-research-dossier";
import type { TradeSetupEvaluation } from "./signal-gate";
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

function flowRatio(token: TrendingToken, intel: TokenIntel): number {
  const buys = token.txns24h?.buys ?? intel.buy24h ?? 0;
  const sells = token.txns24h?.sells ?? intel.sell24h ?? 1;
  return buys / Math.max(sells, 1);
}

function flowBias(token: TrendingToken, intel: TokenIntel): "buy" | "sell" | "mixed" {
  const r = flowRatio(token, intel);
  if (r > 1.12) return "buy";
  if (r < 0.88) return "sell";
  return "mixed";
}

function intradaySnippet(token: TrendingToken): string {
  const m5 = token.priceChange?.m5 ?? 0;
  const h1 = token.priceChange?.h1 ?? 0;
  if (m5 <= -20 || h1 <= -25) return `5m ${m5.toFixed(1)}% · 1h ${h1.toFixed(1)}% — intraday collapse (meme exit risk)`;
  if (h1 > 8 && m5 > -5) return `5m ${m5 >= 0 ? "+" : ""}${m5.toFixed(1)}% · 1h +${h1.toFixed(1)}% — momentum intact`;
  return `5m ${m5 >= 0 ? "+" : ""}${m5.toFixed(1)}% · 1h ${h1 >= 0 ? "+" : ""}${h1.toFixed(1)}%`;
}

function taSnippet(intel: TokenIntel): string | null {
  const ta = intel.technical;
  if (!ta) return null;
  const src = ta.taSource === "birdeye_ohlcv" ? "Birdeye OHLCV" : "Dex structure est.";
  return `${src}: RSI ${ta.rsi.toFixed(0)} (${ta.rsiSignal}), MACD ${ta.macdSignal}, ${ta.trend.replace(/_/g, " ")}`;
}

function gateSnippet(gate?: TradeSetupEvaluation): string | null {
  if (!gate) return null;
  if (gate.tier === "a-plus" || gate.tier === "a") {
    return `Entry gate ${gate.tier.toUpperCase()} — ${gate.checksPassed}/${gate.checksTotal} checks aligned`;
  }
  if (gate.tier === "avoid") return `Entry gate BLOCKED — ${gate.gaps[0] ?? "rug/exit pattern"}`;
  if (gate.gaps.length > 0) {
    return `Entry gate WATCH — needs ${gate.gaps.slice(0, 2).join(" + ")}`;
  }
  return `Entry gate WATCH — ${gate.checksPassed}/${gate.checksTotal} checks`;
}

function gmgnSkillNotes(
  token: TrendingToken,
  intel: TokenIntel,
  tier: NarrativeTier,
  smartRows: number,
  holderRows: number,
): string[] {
  const notes: string[] = [];
  const gmgnTag = token.sourceTags?.some((s) => /GMGN|launch/i.test(s));
  if (gmgnTag && tier === "feed") {
    notes.push("GMGN fresh/trending slot — verify two-sided liquidity before ape size");
  }
  if (!hasGmgnApiKey()) return notes;
  if (tier === "alpha") {
    notes.push("GMGN holder radar · smart-money tags · wallet concentration");
    if (smartRows > 0) notes.push(`${smartRows} smart-money wallets on pair`);
    if (holderRows > 0) notes.push(`${holderRows} top holders ranked (GMGN)`);
  }
  if (intel.whaleCount != null && intel.whaleCount > 0) {
    notes.push(`${intel.whaleCount} whale-class wallets in flow pass`);
  }
  if (intel.sniperCount != null && intel.sniperCount > 4) {
    notes.push(`${intel.sniperCount} snipers — pros fade crowded sniper clusters`);
  }
  return notes.slice(0, tier === "alpha" ? 5 : 3);
}

function actionPlaybook(
  token: TrendingToken,
  action: AgentSignal["action"],
  tier: NarrativeTier,
  gate?: TradeSetupEvaluation,
): string {
  const t = turnover(token);
  const inv =
    action === "BUY"
      ? "Invalidate long if 1h rolls −10% or sells > buys for 2 refreshes."
      : action === "HOLD"
        ? "Stalk: need flow >1.12× + 1h hold green before first clip."
        : "Do not bid dips until crime-dump clears on 5m/1h.";

  if (tier === "feed") {
    if (action === "BUY") {
      return t > 10
        ? `Desk: scale clip only — ${t.toFixed(1)}× turnover vs liq; trail under last 1h low. ${inv}`
        : `Desk: tactical long if gate holds — partials into +15–25%, never full port. ${inv}`;
    }
    if (action === "SELL") {
      return `Desk: distribution / trap — cut weak bags, no average-down. ${inv}`;
    }
    const missing = gate?.gaps?.[0] ?? "full alignment";
    return `Desk: no entry — ${missing}. Alpha Scan for holder tables + GMGN depth. ${inv}`;
  }

  if (action === "BUY") {
    return t > 12
      ? "Coach: high-turn meme — scale in, trail under 15m swing, partials into extensions."
      : "Coach: bid must hold above pool band; no chase on vertical candle without holders.";
  }
  if (action === "SELL") {
    return "Coach: risk-off — cut exposure; re-rate only if flow + smart money flip together.";
  }
  return "Coach: stalk book — re-enter when 1h MACD and buy/sell skew confirm.";
}

function deskVerdictLabel(
  action: AgentSignal["action"],
  conf: number,
  risk: number,
  gate?: TradeSetupEvaluation,
): string {
  const tier =
    gate?.tier === "a-plus"
      ? "A+"
      : gate?.tier === "a"
        ? "A"
        : gate?.tier === "avoid"
          ? "AVOID"
          : "WATCH";
  return `Desk ${action} (${tier}) · ${conf}% conf · risk ${risk}/100`;
}

/** Token-unique narrative — pro meme desk (Dex / Birdeye / flow), not signal-group AI. */
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
    gate?: TradeSetupEvaluation;
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
  const fr = flowRatio(token, intel);
  const ta = taSnippet(intel);
  const intra = intradaySnippet(token);
  const gateLine = gateSnippet(opts?.gate);
  const top10 = intel.top10HolderPercent;
  const gmgnNotes = gmgnSkillNotes(token, intel, tier, opts?.smartMoneyRows ?? 0, opts?.holderRows ?? 0);

  if (opts?.securityLabel?.toLowerCase().includes("honeypot")) {
    const warn =
      `${token.symbol} honeypot / exit-trap (${opts.securityLabel}) — +${ch.toFixed(0)}% 24h is not a 2x/10x long. Desk ${action} (${conf}% conf).`;
    return {
      narrative: warn,
      coachLines: ["Meme rule #1: if you cannot sell, you are exit liquidity."],
      gmgnNotes: ["GMGN/Dex security flagged honeypot — see card badge"],
      playbook: "Avoid — wait for clean contract + two-sided pool.",
    };
  }

  if (!isTokenQuoteReliable(token)) {
    return {
      narrative: unreliableQuoteMessage(token.symbol),
      coachLines: ["Wait for Dex pool sync — price row updates before sizing."],
      gmgnNotes,
      playbook: "Quote pending",
    };
  }

  const flowLine =
    flow === "buy"
      ? `flow ${fr.toFixed(2)}× buy-heavy (Dex txns)`
      : flow === "sell"
        ? `flow ${fr.toFixed(2)}× sell-heavy (distribution)`
        : `flow ~balanced (${fr.toFixed(2)}×)`;

  const poolLine = `liq ${fmtUsd(liq)} · vol ${fmtUsd(vol)} · ${t.toFixed(1)}× turnover vs pool`;
  const tapeLine =
    ch < -12
      ? `24h ${ch.toFixed(1)}% — sellers control tape`
      : ch > 35
        ? `24h +${ch.toFixed(1)}% — extended; fade late apes without holder support`
        : `24h ${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%`;

  const concLine =
    top10 != null
      ? top10 > 55
        ? `top10 ${top10.toFixed(0)}% — concentration risk`
        : top10 < 35
          ? `top10 ${top10.toFixed(0)}% — healthier holder spread`
          : `top10 ${top10.toFixed(0)}%`
      : null;

  const verdict = deskVerdictLabel(action, conf, risk, opts?.gate);
  const taPart = ta ? ` ${ta}.` : "";
  const gatePart = gateLine ? ` ${gateLine}.` : "";
  const structPart = opts?.patternLabel ? ` Pattern: ${opts.patternLabel}.` : "";

  let core = `${token.symbol} @ ${formatTokenPrice(token.priceUsd)} — ${tapeLine}; ${intra}; ${flowLine}; ${poolLine}.`;
  if (action === "BUY") {
    core += " Pro meme entry: only when gate + flow + intraday agree — not Telegram hype alone.";
  } else if (action === "HOLD") {
    core += " Stalk setup — patience beats forcing entries on green 24h with weak 1h.";
  } else {
    core += " Reduce risk — chart/flow does not support holding for upside.";
  }

  const research =
    tier === "alpha" && opts?.researchThesis
      ? ` Alpha desk: ${opts.researchThesis.slice(0, 200)}`
      : "";

  const narrative = `${verdict}. ${core}${gatePart}${taPart}${concLine ? ` ${concLine}.` : ""}${structPart}${research}`
    .replace(/\s+/g, " ")
    .trim();

  const coachLines: string[] = [actionPlaybook(token, action, tier, opts?.gate)];
  if (tier === "feed") {
    coachLines.push(
      "Live feed = scout pass (Dex + Birdeye TA + entry gate). Size like a pro: liq → intraday → flow → holders.",
    );
    if (hasBirdeyeKey() && intel.technical?.taSource === "birdeye_ohlcv") {
      coachLines.push("Birdeye drives RSI/MACD on this row — same stack pros use on Birdeye/Dex.");
    }
    if (gmgnNotes[0]) coachLines.push(gmgnNotes[0]);
    if (intel.isMintable || intel.isFreezable) {
      coachLines.push(
        `Contract: ${intel.isMintable ? "mintable" : "no mint"} · ${intel.isFreezable ? "freezable" : "no freeze"} — cut size if mutable.`,
      );
    }
  } else {
    coachLines.push(
      "Pro meme workflow: holder table → smart tags → 15m/1h TA → size vs liquidity, not hype.",
    );
    if (hasBirdeyeKey()) coachLines.push("Birdeye OHLCV stack on this token.");
    if (gmgnNotes[0]) coachLines.push(gmgnNotes[0]);
  }

  return {
    narrative,
    coachLines: coachLines.slice(0, tier === "alpha" ? 5 : 4),
    gmgnNotes,
    playbook: coachLines[0],
  };
}

export function narrativeToWhyAction(bundle: TokenNarrativeBundle, maxLen = 200): string {
  const line = bundle.playbook || bundle.narrative;
  return line.length > maxLen ? `${line.slice(0, maxLen - 1)}…` : line;
}

export function edgeFromReasoningFactors(factors?: ReasoningFactor[]): number {
  let edge = 0;
  for (const f of factors ?? []) {
    const w = f.weight ?? 10;
    if (f.impact === "bullish") edge += w;
    else if (f.impact === "bearish") edge -= w;
  }
  return edge;
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
