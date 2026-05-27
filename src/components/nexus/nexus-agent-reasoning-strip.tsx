"use client";

import { Brain, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TokenDossierPayload, LiveReasoningFactor } from "@/lib/nexus-research-dossier";
import type { AgentSignal } from "@/lib/storage";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { FEED_INTEL_LABEL, ALPHA_INTEL_LABEL } from "@/lib/nexus-copy";

function FactorChip({ factor }: { factor: LiveReasoningFactor }) {
  const tone =
    factor.impact === "bullish"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : factor.impact === "bearish"
        ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
        : "border-white/15 bg-white/5 text-white/70";
  return (
    <span
      className={cn("inline-block max-w-full rounded-lg border px-2 py-1 text-[10px] leading-snug", tone)}
      title={factor.detail}
    >
      <span className="font-semibold">{factor.label}</span>
      <span className="text-white/60"> · {factor.detail}</span>
    </span>
  );
}

function mergeAgent(
  token: TrendingMarketToken,
  payload: TokenDossierPayload | null,
): AgentSignal | undefined {
  return payload?.agent ?? token.agent;
}

function mergeFactors(
  agent: AgentSignal | undefined,
  live: TokenDossierPayload["liveReasoning"] | undefined,
): LiveReasoningFactor[] {
  if (agent?.reasoningFactors?.length) {
    return agent.reasoningFactors.map((f) => ({
      label: f.label,
      detail: f.detail,
      impact: f.impact,
    }));
  }
  return live?.factors ?? [];
}

function mergeNarrative(
  agent: AgentSignal | undefined,
  live: TokenDossierPayload["liveReasoning"] | undefined,
  fundamentals?: string[],
): string {
  const parts = [
    agent?.whyAction,
    agent?.reasoning && agent.reasoning !== agent.whyAction ? agent.reasoning : null,
    live?.narrative && !live.narrative.startsWith(`${agent?.action ?? "HOLD"} `) ? live.narrative : null,
    fundamentals?.[0],
  ].filter(Boolean) as string[];
  return parts.join(" ").trim();
}

export function NexusAgentReasoningStrip({
  token,
  payload,
  loading,
  tier,
  alphaThesis,
}: {
  token: TrendingMarketToken;
  payload: TokenDossierPayload | null;
  loading: boolean;
  tier: "feed" | "alpha";
  /** Preloaded from Alpha Scan row before dossier finishes */
  alphaThesis?: string;
}) {
  const agent = mergeAgent(token, payload);
  const live = payload?.liveReasoning;
  const dossier = payload?.dossier;
  const action = agent?.action ?? live?.action ?? "HOLD";
  const confidence = agent?.confidence ?? live?.confidence ?? 0;
  const riskScore = agent?.riskScore ?? live?.riskScore ?? 0;
  const factors = mergeFactors(agent, live);
  const narrative =
    mergeNarrative(agent, live, dossier?.fundamentals) || alphaThesis || "";

  const tierLabel = tier === "alpha" ? ALPHA_INTEL_LABEL : FEED_INTEL_LABEL;
  const isAlpha = tier === "alpha";

  return (
    <section
      className={cn(
        "nexus-agent-reasoning-strip rounded-xl border px-3 py-2.5",
        isAlpha
          ? "border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/[0.08] to-cyan-500/[0.05]"
          : "border-cyan-400/20 bg-cyan-500/[0.05]",
      )}
      aria-label="Agent reasoning"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Brain className="h-4 w-4 shrink-0 text-cyan-200" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-100/90">
          Agent reasoning
        </p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase",
            isAlpha
              ? "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-100"
              : "border-white/15 bg-black/30 text-white/55",
          )}
        >
          {tierLabel}
        </span>
        {isAlpha && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-100">
            <Sparkles className="h-3 w-3" />
            Gas-paid deep scan
          </span>
        )}
        <span className="ml-auto text-[10px] tabular-nums text-white/50">
          {action} · {confidence}% · risk {riskScore}/100
        </span>
      </div>

      {loading && !narrative ? (
        <p className="flex items-center gap-2 text-xs text-white/55">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {isAlpha
            ? "Loading full thesis (GMGN · Birdeye · news · smart money)…"
            : "Refreshing Dex-verified snapshot…"}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-white/88">
          {narrative ||
            (isAlpha
              ? "Alpha dossier loading — ranked scan includes multi-source thesis and risk breakdown."
              : "Verdict uses live price, liquidity, and flow — expand Technical analysis below for TA detail.")}
        </p>
      )}

      {factors.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            {isAlpha ? "Signal stack (full)" : "Key signals"}
          </p>
          <div className="flex flex-col gap-1">
            {(isAlpha ? factors : factors.slice(0, 4)).map((f) => (
              <FactorChip key={`${f.label}-${f.detail.slice(0, 24)}`} factor={f} />
            ))}
          </div>
        </div>
      )}

      {live?.sources?.length ? (
        <p className="mt-2 text-[10px] text-white/40">
          Data: {live.sources.join(" · ")}
          {payload?.fetchedAt ? ` · updated ${new Date(payload.fetchedAt).toLocaleTimeString()}` : ""}
        </p>
      ) : tier === "feed" ? (
        <p className="mt-2 text-[10px] text-white/40">
          Live feed uses Dex + security heuristics; top-volume names also get Birdeye TA. Run Alpha Scan for
          full thesis.
        </p>
      ) : null}
    </section>
  );
}
