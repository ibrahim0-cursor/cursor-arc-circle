"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";
import { cn } from "@/lib/utils";

export type NexusScanActionId = "alpha";

type Action = {
  id: NexusScanActionId;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const btnClass =
  "nexus-scan-btn-alpha border-violet-400/35 bg-gradient-to-br from-violet-500/22 to-indigo-950/50 hover:border-violet-400/55 hover:shadow-[0_0_28px_rgba(168,85,247,0.28)]";

/** Primary scan control — Alpha Scan only */
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
        compact ? "flex flex-col gap-2" : "grid gap-3",
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
            btnClass,
            compact && "min-h-[52px] w-full",
            !compact && "sm:max-w-md",
          )}
        >
          {a.loading ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white/90" />
            </span>
          ) : (
            <ArcIconFrame
              icon={a.icon}
              variant="home"
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
                Deep multi-source analysis · 2x+ movers ranked
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
