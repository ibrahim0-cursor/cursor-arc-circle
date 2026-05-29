"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { Badge } from "@/components/ui/badge";
import { formatCompact, formatPct } from "@/lib/utils";
import type { PrismPrediction } from "@/lib/storage";

export const PrismSectionHead = memo(function PrismSectionHead({
  icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <ArcIcon3d icon={icon} theme="prism" size="sm" static />
      <h2 className="text-base font-semibold text-white sm:text-lg">{title}</h2>
    </div>
  );
});

export const MacroChip = memo(function MacroChip({
  label,
  price,
  change,
  compact,
}: {
  label: string;
  price: number;
  change: number;
  compact?: boolean;
}) {
  const up = change >= 0;
  return (
    <div className="prism-macro-chip arc-glass-card arc-glass-card-prism rounded-xl px-2.5 py-2.5 text-center sm:px-3">
      <p className="text-[9px] uppercase tracking-wider text-white/45 sm:text-[10px]">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-white sm:text-base">
        {compact ? formatCompact(price) : `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
      </p>
      <p
        className={`mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-medium ${up ? "text-emerald-300" : "text-rose-300"}`}
      >
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {formatPct(change)}
      </p>
    </div>
  );
});

export const MiniStat = memo(function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="arc-glass-card arc-glass-card-prism arc-glass-interactive px-2 py-2 text-center sm:px-3">
      <p className="text-[9px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-white sm:text-sm">{value}</p>
    </div>
  );
});

function sentimentFromTitle(title: string): "bullish" | "bearish" | "neutral" | "risk" {
  const t = title.toLowerCase();
  if (/crash|war|sanction|hack|collapse|fear|recession|downgrade|strike/i.test(t)) return "risk";
  if (/surge|rally|record|approval|cut|stimulus|peace|deal|growth|beat/i.test(t)) return "bullish";
  if (/drop|fall|selloff|inflation|hike|tightening|loss/i.test(t)) return "bearish";
  return "neutral";
}

export const IntelRow = memo(function IntelRow({ source, title }: { source: string; title: string }) {
  const mood = sentimentFromTitle(title);
  const styles = {
    bullish: "border-emerald-400/30 bg-emerald-500/10",
    bearish: "border-rose-400/30 bg-rose-500/10",
    risk: "border-amber-400/35 bg-amber-500/12",
    neutral: "border-amber-400/20 bg-amber-500/8",
  };
  const labels = { bullish: "Risk-on", bearish: "Risk-off", risk: "Headline risk", neutral: "Macro" };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${styles[mood]}`}>
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">{source}</p>
        <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/70">
          {labels[mood]}
        </span>
      </div>
      <p className="mt-1 text-sm leading-snug text-white/90">{title}</p>
    </div>
  );
});

export const HistoryRow = memo(function HistoryRow({
  prediction,
  animateIn,
}: {
  prediction: PrismPrediction;
  animateIn?: boolean;
}) {
  const className = "arc-glass-card arc-glass-card-prism arc-glass-interactive p-4";
  const inner = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-white">{prediction.event}</p>
        <Badge variant="prism">{prediction.probability}%</Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-white/60">{prediction.summary}</p>
      <p className="mt-1.5 line-clamp-2 text-xs text-amber-200/75">{prediction.reasoning}</p>
      <p className="mt-1 text-[10px] text-white/45">
        Confidence {prediction.confidence}% · Kelly {(prediction.kellyFraction * 100).toFixed(1)}%
      </p>
    </>
  );

  if (animateIn) {
    return (
      <div className={`${className} prism-history-enter`} style={{ animationFillMode: "both" }}>
        {inner}
      </div>
    );
  }

  return <div className={className}>{inner}</div>;
});
