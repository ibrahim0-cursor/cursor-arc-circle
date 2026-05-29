"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { cn } from "@/lib/utils";

/** PRISM panel with horizontal collapse header — keeps content inside glass bounds. */
export function PrismCollapsible({
  label,
  hint,
  icon: Icon,
  defaultOpen = true,
  children,
  className,
  bodyClassName,
}: {
  label: string;
  hint?: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "prism-collapsible arc-glass-card-prism overflow-hidden rounded-2xl border border-white/10",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-[48px] items-center justify-between gap-2 border-b border-white/10 bg-black/30 px-3 py-3 text-left sm:px-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <ArcIcon3d icon={Icon} theme="prism" size="sm" static />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{label}</p>
            {hint && !open && (
              <p className="mt-0.5 truncate text-[11px] text-white/50">{hint}</p>
            )}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/70">
          {open ? "Hide" : "Show"}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
          />
        </span>
      </button>
      {open && (
        <div className={cn("prism-collapsible-body min-h-0 overflow-hidden px-3 py-3 sm:px-4", bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}
