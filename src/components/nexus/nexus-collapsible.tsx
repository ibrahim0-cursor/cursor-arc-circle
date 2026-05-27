"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";

export type NexusCollapsibleVariant = "default" | "reasoning" | "technical" | "intel";

const VARIANT_THEME: Record<NexusCollapsibleVariant, "nexus" | "home" | "prism" | "neutral"> = {
  default: "neutral",
  reasoning: "nexus",
  technical: "home",
  intel: "prism",
};

export function NexusCollapsible({
  label,
  hint,
  defaultOpen = false,
  children,
  className = "",
  variant = "default",
  icon: Icon,
  showCollapseHint = false,
}: {
  label: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  variant?: NexusCollapsibleVariant;
  icon?: LucideIcon;
  /** Show "Collapse" label beside chevron (feed / trade panels) */
  showCollapseHint?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const badgeTheme = VARIANT_THEME[variant];

  return (
    <div className={`arc-panel arc-panel-nexus overflow-hidden ${className}`}>
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <button
        type="button"
        data-nexus-collapsible-trigger
        aria-expanded={open}
        aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
        onClick={() => setOpen((prev) => !prev)}
        className="nexus-collapsible-trigger sticky top-0 z-10 flex w-full min-h-[48px] items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0a0c12]/95 px-4 py-3.5 text-left backdrop-blur-md transition hover:bg-white/[0.04] max-lg:min-h-[52px] max-lg:py-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {Icon && <ArcIconBadge icon={Icon} theme={badgeTheme} size="sm" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-white">{label}</p>
            {hint && !open && (
              <p className="mt-0.5 truncate text-xs leading-snug text-white/65">{hint}</p>
            )}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          {showCollapseHint && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/55">
              {open ? "Collapse" : "Expand"}
            </span>
          )}
          <span
            className={`nexus-collapsible-chevron transition-transform duration-200 ${open ? "rotate-180 border-emerald-400/40 bg-emerald-500/15 text-emerald-100" : ""}`}
            aria-hidden
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </span>
      </button>
      {open && (
        <div className="nexus-collapsible-body flex min-h-0 flex-1 flex-col overflow-hidden border-t border-white/[0.08] px-3 py-3 sm:px-4">
          {children}
        </div>
      )}
    </div>
  );
}
