"use client";

import { Activity, Brain, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveReasoningPayload, LiveReasoningFactor } from "@/lib/nexus-research-dossier";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

function actionStyles(action: string) {
  if (action === "BUY") return "border-emerald-400/45 bg-emerald-500/20 text-emerald-100";
  if (action === "SELL") return "border-rose-400/45 bg-rose-500/20 text-rose-100";
  return "border-amber-400/35 bg-amber-500/15 text-amber-100";
}

function FactorRow({ factor }: { factor: LiveReasoningFactor }) {
  const Icon =
    factor.impact === "bullish" ? TrendingUp : factor.impact === "bearish" ? TrendingDown : Activity;
  const border =
    factor.impact === "bullish"
      ? "border-l-emerald-400"
      : factor.impact === "bearish"
        ? "border-l-rose-400"
        : "border-l-white/25";

  return (
    <div
      className={cn(
        "flex gap-2 rounded-lg border border-white/[0.08] border-l-[3px] bg-black/30 px-3 py-2",
        border,
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/55" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white">{factor.label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/70">{factor.detail}</p>
      </div>
    </div>
  );
}

function fallbackFromToken(token: TrendingMarketToken): LiveReasoningPayload | null {
  const a = token.agent;
  if (!a?.whyAction && !a?.reasoning) return null;
  return {
    action: a.action,
    confidence: a.confidence,
    riskScore: a.riskScore,
    headline: `${a.action} ${a.confidence}% · risk ${a.riskScore}/100`,
    narrative: a.whyAction || a.reasoning,
    factors: (a.reasoningFactors ?? []).map((f) => ({
      label: f.label,
      detail: f.detail,
      impact: f.impact,
    })),
    taHeadline: token.intel?.technical
      ? `RSI ${token.intel.technical.rsi?.toFixed?.(0) ?? "—"} · MACD ${token.intel.technical.macdSignal ?? "—"}`
      : "TA loads with dossier…",
    sources: ["Feed agent"],
  };
}

export function NexusLiveReasoningPanel({
  live,
  token,
  loading,
}: {
  live?: LiveReasoningPayload | null;
  token: TrendingMarketToken;
  loading?: boolean;
}) {
  const data = live ?? fallbackFromToken(token);

  if (!data) {
    return (
      <div className="nexus-live-reasoning rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-3">
        <p className="text-xs text-white/55">
          {loading ? "Agent is reading on-chain, social, and chart data…" : "Live reasoning appears after dossier load."}
        </p>
      </div>
    );
  }

  return (
    <section className="nexus-live-reasoning space-y-2.5 rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/14 via-black/40 to-cyan-500/8 px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-200" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-200/90">
            Live agent reasoning
          </span>
        </div>
        <span
          className={cn(
            "rounded-lg border px-2.5 py-1 text-xs font-bold uppercase",
            actionStyles(data.action),
          )}
        >
          {data.action} · {data.confidence}%
        </span>
      </div>

      <p className="text-sm font-semibold leading-snug text-white">{data.headline}</p>
      <p className="nexus-lead text-sm leading-relaxed text-white/88">{data.narrative}</p>

      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.06] px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/80">Technical read</p>
        <p className="mt-1 text-xs leading-relaxed text-white/80">{data.taHeadline}</p>
      </div>

      {data.factors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Signal breakdown</p>
          {data.factors.map((f) => (
            <FactorRow key={`${f.label}-${f.detail.slice(0, 24)}`} factor={f} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-white/40">
        Sources: {data.sources.join(" · ")}
        {loading ? " · refreshing…" : ""}
      </p>
    </section>
  );
}
