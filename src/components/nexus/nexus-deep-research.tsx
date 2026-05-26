"use client";

import {
  AlertTriangle,
  Brain,
  Crosshair,
  Newspaper,
  TrendingUp,
  Waves,
  X,
} from "lucide-react";
import type { NexusResearchReport } from "@/lib/nexus-research";
import { formatDistanceToNow } from "date-fns";

export function NexusDeepResearchPanel({
  report,
  onClose,
}: {
  report: NexusResearchReport;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-violet-400/35 bg-gradient-to-br from-violet-500/10 via-black/20 to-cyan-500/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-200" />
          <div>
            <p className="text-sm font-semibold text-white">Deep Research · {report.symbol}</p>
            <p className="text-[10px] text-white/45">
              {formatDistanceToNow(new Date(report.generatedAt), { addSuffix: true })} · not a duplicate
              feed badge
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 p-1.5 text-white/60 hover:bg-white/10"
            aria-label="Close research"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-[11px] italic text-white/50">{report.signalContext}</p>

      <section>
        <p className="nexus-caption mb-1.5 flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-violet-300" />
          Investment thesis
        </p>
        <p className="text-sm leading-relaxed text-white/85">{report.thesis}</p>
      </section>

      <section>
        <p className="nexus-caption mb-1.5 flex items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5 text-cyan-300" />
          Levels to watch
        </p>
        <ul className="space-y-1 text-xs text-white/75">
          {report.watchLevels.map((l) => (
            <li key={l} className="flex gap-2">
              <span className="text-cyan-400">•</span>
              {l}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="nexus-caption mb-1.5 flex items-center gap-1.5">
          <Waves className="h-3.5 w-3.5 text-cyan-300" />
          Liquidity & tape
        </p>
        <p className="text-xs text-white/75">{report.liquidityNote}</p>
        <p className="mt-1 text-xs text-white/65">{report.taSummary}</p>
      </section>

      <section>
        <p className="nexus-caption mb-1.5 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
          On-chain snapshot
        </p>
        <p className="text-xs text-white/75">{report.whaleInsight}</p>
      </section>

      <section>
        <p className="nexus-caption mb-1.5 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
          Risks
        </p>
        <ul className="space-y-1 text-xs text-amber-100/90">
          {report.risks.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
      </section>

      <section>
        <p className="nexus-caption mb-1.5 flex items-center gap-1.5">
          <Newspaper className="h-3.5 w-3.5 text-blue-300" />
          News & catalysts
        </p>
        <ul className="space-y-1.5 text-xs text-white/70">
          {report.catalysts.map((c) => (
            <li key={c} className="rounded-lg border border-white/8 bg-black/25 px-2 py-1.5">
              {c}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
