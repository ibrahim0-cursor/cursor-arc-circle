"use client";

import { Brain, Database, Loader2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";
import { cn } from "@/lib/utils";

export type NexusScanActionId = "memory" | "alpha" | "research";

type Action = {
  id: NexusScanActionId;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const frameVariant: Record<NexusScanActionId, "nexus" | "home" | "prism"> = {
  memory: "nexus",
  alpha: "home",
  research: "prism",
};

const btnClass: Record<NexusScanActionId, string> = {
  memory:
    "nexus-scan-btn-memory border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 hover:border-emerald-400/55 hover:shadow-[0_0_28px_rgba(18,232,168,0.25)]",
  alpha:
    "nexus-scan-btn-alpha border-violet-400/35 bg-gradient-to-br from-violet-500/22 to-indigo-950/50 hover:border-violet-400/55 hover:shadow-[0_0_28px_rgba(168,85,247,0.28)]",
  research:
    "nexus-scan-btn-research border-amber-400/30 bg-gradient-to-br from-amber-500/18 to-violet-950/40 hover:border-amber-400/50 hover:shadow-[0_0_28px_rgba(251,191,36,0.2)]",
};

/** Primary scan controls — visually distinct from stat chips below */
export function NexusScanActions({
  actions,
  className,
  compact,
}: {
  actions: Action[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "nexus-scan-actions",
        compact ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap" : "grid gap-3 sm:grid-cols-3",
        className,
      )}
      role="group"
      aria-label="Agent scans"
    >
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!a.disabled && !a.loading) a.onClick();
          }}
          disabled={a.disabled || a.loading}
          aria-busy={a.loading}
          aria-label={a.label}
          className={cn(
            "nexus-scan-btn relative isolate z-[1] flex min-h-[56px] items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
            btnClass[a.id],
            compact && "min-h-[52px] flex-1 sm:min-w-[140px]",
          )}
        >
          {a.loading ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white/90" />
            </span>
          ) : (
            <ArcIconFrame
              icon={a.icon}
              variant={frameVariant[a.id]}
              size="sm"
              active
              className="shrink-0 pointer-events-none"
            />
          )}
          <span className="min-w-0 flex-1 pointer-events-none">
            <span className="flex items-center gap-2">
              <span className="block text-sm font-bold text-white">{a.label}</span>
              <span className="nexus-scan-run rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90">
                Run
              </span>
            </span>
            {!compact && (
              <span className="mt-0.5 block text-[11px] text-white/50">
                {a.id === "memory" && "Archive feed intel"}
                {a.id === "alpha" && "Rank opportunities"}
                {a.id === "research" && "Thesis & risks"}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
