"use client";

import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatUsd } from "@/lib/utils";
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

  return (
    <Card className="border-emerald-400/20 bg-gradient-to-b from-emerald-400/[0.05] to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-300" />
            <h2 className="text-lg font-medium">Technical Analysis</h2>
          </div>
          <Badge variant="nexus">TA Score {technical.score}/100</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            label="RSI"
            value={technical.rsi.toFixed(1)}
            sub={technical.rsiSignal}
            color={
              technical.rsiSignal === "overbought"
                ? "text-rose-300"
                : technical.rsiSignal === "oversold"
                  ? "text-emerald-300"
                  : "text-white/70"
            }
          />
          <Metric
            label="MACD"
            value={technical.macd.toFixed(2)}
            sub={technical.macdSignal}
            color={
              technical.macdSignal === "bullish"
                ? "text-emerald-300"
                : technical.macdSignal === "bearish"
                  ? "text-rose-300"
                  : "text-white/70"
            }
          />
          <Metric label="Trend" value={technical.trend.replace("_", " ")} icon />
          {priceUsd && support !== undefined && resistance !== undefined && (
            <Metric label="S/R" value={`${formatUsd(support)} – ${formatUsd(resistance)}`} />
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/70">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Trend line read</p>
          <p className="mt-1">{technical.trendLine}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {technical.macdSignal === "bullish" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-emerald-200">
              <TrendingUp className="h-3 w-3" /> MACD bullish crossover
            </span>
          )}
          {technical.macdSignal === "bearish" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-rose-200">
              <TrendingDown className="h-3 w-3" /> MACD bearish crossover
            </span>
          )}
          {technical.rsiSignal === "oversold" && (
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-cyan-200">
              RSI oversold — bounce watch
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 text-sm font-semibold capitalize ${color ?? "text-white/85"}`}>
        {icon && value.includes("up") ? <TrendingUp className="mr-1 inline h-3.5 w-3.5" /> : null}
        {icon && value.includes("down") ? <TrendingDown className="mr-1 inline h-3.5 w-3.5" /> : null}
        {value}
      </p>
      {sub && <p className="text-[10px] capitalize text-white/45">{sub}</p>}
    </div>
  );
}
