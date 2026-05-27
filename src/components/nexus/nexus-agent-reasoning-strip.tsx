"use client";

import { Brain, Loader2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TokenDossierPayload, LiveReasoningFactor } from "@/lib/nexus-research-dossier";
import type { AgentSignal } from "@/lib/storage";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { FEED_INTEL_LABEL, ALPHA_INTEL_LABEL, REASONING_HEADLINE } from "@/lib/nexus-copy";

function FactorRow({ factor }: { factor: LiveReasoningFactor }) {
  const Icon =
    factor.impact === "bullish" ? "▲" : factor.impact === "bearish" ? "▼" : "·";
  return (
    <li className="flex gap-2 rounded-lg border border-white/[0.08] bg-black/25 px-2.5 py-2 text-[11px] leading-snug text-white/80">
      <span className="shrink-0 font-bold text-white/45">{Icon}</span>
      <span>
        <span className="font-semibold text-white">{factor.label}</span>
        <span className="text-white/60"> — {factor.detail}</span>
      </span>
    </li>
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
  alphaThesis?: string;
}) {
  const agent = mergeAgent(token, payload);
  const live = payload?.liveReasoning;
  const action = agent?.action ?? live?.action ?? "HOLD";
  const confidence = agent?.confidence ?? live?.confidence ?? 0;
  const riskScore = agent?.riskScore ?? live?.riskScore ?? 0;
  const factors = mergeFactors(agent, live);
  const isAlpha = tier === "alpha";

  const narrative =
    live?.narrative ||
    agent?.whyAction ||
    agent?.reasoning ||
    alphaThesis ||
    "";

  const coachLines = live?.coachLines ?? [];
  const gmgnNotes = live?.gmgnNotes ?? [];
  const maxFactors = isAlpha ? factors.length : Math.min(factors.length, 5);

  return (
    <section
      className={cn(
        "nexus-agent-reasoning-strip rounded-xl border px-3 py-3",
        isAlpha
          ? "border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/[0.1] to-cyan-500/[0.06]"
          : "border-cyan-400/25 bg-cyan-500/[0.07]",
      )}
      aria-label="Agent reasoning — read before you trade"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Brain className="h-4 w-4 shrink-0 text-cyan-200" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-100/90">
            Agent reasoning
          </p>
          <p className="text-[10px] text-white/45">{REASONING_HEADLINE}</p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase",
            isAlpha
              ? "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-100"
              : "border-white/15 bg-black/30 text-white/55",
          )}
        >
          {isAlpha ? ALPHA_INTEL_LABEL : FEED_INTEL_LABEL}
        </span>
        <span className="text-[10px] tabular-nums font-semibold text-white/70">
          {action} · {confidence}% · risk {riskScore}
        </span>
      </div>

      {loading && !narrative ? (
        <p className="flex items-center gap-2 text-xs text-white/55">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {isAlpha ? "Deep scan: GMGN · Birdeye · holders · coach thesis…" : "Dex-verified reasoning…"}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-white/90">{narrative}</p>
      )}

      {isAlpha && coachLines.length > 0 && (
        <div className="mt-3 rounded-lg border border-fuchsia-400/20 bg-black/30 px-3 py-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200/90">
            <Target className="h-3.5 w-3.5" />
            Pro coach playbook
          </p>
          <ul className="space-y-1.5 text-[11px] leading-relaxed text-white/75">
            {coachLines.map((line) => (
              <li key={line.slice(0, 40)}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {!isAlpha && coachLines[0] && (
        <p className="mt-2 text-[11px] text-white/55 italic">{coachLines[0]}</p>
      )}

      {gmgnNotes.length > 0 && (
        <ul className="mt-2 space-y-1 text-[10px] text-cyan-200/75">
          {gmgnNotes.map((n) => (
            <li key={n}>GMGN · {n}</li>
          ))}
        </ul>
      )}

      {maxFactors > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
            {isAlpha ? "Full signal stack (this token only)" : "Key signals for this token"}
          </p>
          <ul className="space-y-1">
            {factors.slice(0, maxFactors).map((f) => (
              <FactorRow key={`${f.label}-${f.detail.slice(0, 28)}`} factor={f} />
            ))}
          </ul>
        </div>
      )}

      {live?.sources?.length ? (
        <p className="mt-2 text-[10px] text-white/40">
          Sources: {live.sources.join(" · ")}
          {payload?.fetchedAt ? ` · ${new Date(payload.fetchedAt).toLocaleTimeString()}` : ""}
        </p>
      ) : null}
    </section>
  );
}
