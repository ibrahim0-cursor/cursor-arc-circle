"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

export type NexusCollapsibleVariant = "default" | "reasoning" | "technical" | "intel";

const VARIANT_STYLES: Record<
  NexusCollapsibleVariant,
  { border: string; bg: string; accent: string; label: string; iconBg: string }
> = {
  default: {
    border: "border-white/12",
    bg: "bg-white/[0.03]",
    accent: "text-white/90",
    label: "text-white",
    iconBg: "bg-white/10 text-white/70",
  },
  reasoning: {
    border: "border-cyan-400/25",
    bg: "bg-gradient-to-br from-cyan-500/[0.08] via-transparent to-violet-500/[0.06]",
    accent: "text-cyan-100",
    label: "text-cyan-50",
    iconBg: "bg-cyan-400/15 text-cyan-200",
  },
  technical: {
    border: "border-violet-400/25",
    bg: "bg-gradient-to-br from-violet-500/[0.1] via-transparent to-fuchsia-500/[0.05]",
    accent: "text-violet-100",
    label: "text-violet-50",
    iconBg: "bg-violet-400/15 text-violet-200",
  },
  intel: {
    border: "border-amber-400/25",
    bg: "bg-gradient-to-br from-amber-500/[0.08] via-transparent to-orange-500/[0.05]",
    accent: "text-amber-100",
    label: "text-amber-50",
    iconBg: "bg-amber-400/15 text-amber-200",
  },
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
  const v = VARIANT_STYLES[variant];

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.35)] ${v.border} ${v.bg} ${className}`}
    >
      <button
        type="button"
        data-nexus-collapsible-trigger
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full min-h-[48px] items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.03] max-lg:min-h-[52px] max-lg:py-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {Icon && (
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${v.iconBg}`}>
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold tracking-tight ${v.label}`}>{label}</p>
            {hint && !open && (
              <p className="mt-0.5 truncate text-xs leading-snug text-white/70">{hint}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-white/55 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className={`border-t px-4 py-3.5 ${v.border} nexus-panel-body`}>{children}</div>
      )}
    </div>
  );
}
