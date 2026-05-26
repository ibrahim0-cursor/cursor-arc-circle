"use client";

import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { formatUsd } from "@/lib/utils";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import type { TechnicalSnapshot } from "@/lib/storage";
import type { TechnicalAnalysis } from "@/lib/technical-analysis";

export function NexusTAPanel({
  technical,
  priceUsd,
}: {
  technical?: TechnicalSnapshot | TechnicalAnalysis | null;
  priceUsd?: number;
}) {
  if (!technical) return null;

  const ta = technical as TechnicalAnalysis;
  const support = "support" in ta ? ta.support : undefined;
  const resistance = "resistance" in ta ? ta.resistance : undefined;

  const hint = `RSI ${technical.rsi.toFixed(0)} · MACD ${technical.macdSignal} · ${technical.trend.replace("_", " ")} · ${technical.score}/100`;

  return (
    <NexusCollapsible label="Technical analysis" hint={hint}>
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="RSI" value={technical.rsi.toFixed(1)} sub={technical.rsiSignal} />
          <Stat label="MACD" value={technical.macd.toFixed(2)} sub={technical.macdSignal} />
          <Stat label="Score" value={`${technical.score}/100`} sub={technical.trend.replace("_", " ")} />
        </div>
        {priceUsd && support !== undefined && resistance !== undefined && (
          <p className="text-[11px] text-white/50">
            Support {formatUsd(support)} · Resistance {formatUsd(resistance)}
          </p>
        )}
        <p className="text-[11px] leading-5 text-white/60">{technical.trendLine}</p>
        <div className="flex flex-wrap gap-1.5">
          {technical.macdSignal === "bullish" && (
            <Tag icon={<TrendingUp className="h-3 w-3" />} text="MACD bullish" color="emerald" />
          )}
          {technical.macdSignal === "bearish" && (
            <Tag icon={<TrendingDown className="h-3 w-3" />} text="MACD bearish" color="rose" />
          )}
          {technical.rsiSignal === "oversold" && <Tag text="RSI oversold" color="cyan" />}
          {technical.rsiSignal === "overbought" && <Tag text="RSI overbought" color="rose" />}
        </div>
        <p className="text-[10px] text-white/35">
          <Activity className="mr-1 inline h-3 w-3" />
          Derived from live DexScreener price changes (m5/h1/h6/h24)
        </p>
      </div>
    </NexusCollapsible>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1.5">
      <p className="text-[10px] uppercase text-white/40">{label}</p>
      <p className="text-sm font-medium text-white/85">{value}</p>
      {sub && <p className="text-[10px] capitalize text-white/45">{sub}</p>}
    </div>
  );
}

function Tag({
  text,
  icon,
  color,
}: {
  text: string;
  icon?: React.ReactNode;
  color: "emerald" | "rose" | "cyan";
}) {
  const styles = {
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    rose: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${styles[color]}`}>
      {icon}
      {text}
    </span>
  );
}
