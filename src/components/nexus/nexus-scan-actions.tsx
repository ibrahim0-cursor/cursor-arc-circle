"use client";

import { Brain, Database, Loader2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { cn } from "@/lib/utils";

type Action = {
  id: "memory" | "alpha" | "research";
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  pulse?: boolean;
};

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
        compact ? "flex flex-wrap gap-2" : "grid gap-2 sm:grid-cols-3",
        className,
      )}
    >
      {actions.map((a, i) => (
        <button
          key={a.id}
          type="button"
          onClick={a.onClick}
          disabled={a.disabled}
          className={cn(
            "nexus-scan-action-tile arc-glass-card arc-glass-card-nexus arc-glass-interactive group flex min-h-[52px] items-center gap-3 px-3 py-2.5 text-left transition active:scale-[0.98] disabled:opacity-45",
            a.pulse && "arc-ai-pulse",
            a.id === "research" && "border-violet-400/25",
          )}
        >
          {a.loading ? (
            <Loader2 className="h-8 w-8 shrink-0 animate-spin text-emerald-300" />
          ) : (
            <ArcIcon3d icon={a.icon} theme="nexus" size="sm" delay={i * 0.1} className="shrink-0" />
          )}
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">{a.label}</span>
            {!compact && (
              <span className="arc-caption mt-0.5 block text-white/45">
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
