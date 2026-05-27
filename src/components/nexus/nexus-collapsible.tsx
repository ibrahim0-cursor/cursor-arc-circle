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
}: {
  label: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  variant?: NexusCollapsibleVariant;
  icon?: LucideIcon;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const badgeTheme = VARIANT_THEME[variant];

  return (
    <div className={`arc-panel arc-panel-nexus overflow-hidden ${className}`}>
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <button
        type="button"
        data-nexus-collapsible-trigger
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full min-h-[48px] items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.04] max-lg:min-h-[52px] max-lg:py-4"
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
        <span
          className={`nexus-collapsible-chevron transition-transform duration-200 ${open ? "rotate-180 bg-violet-500/15" : ""}`}
          aria-hidden
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      {open && (
        <div className="border-t border-white/[0.08] px-4 py-3.5 nexus-panel-body">{children}</div>
      )}
    </div>
  );
}
