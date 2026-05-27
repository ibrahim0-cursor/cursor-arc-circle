"use client";

import { ArrowDownUp, Radio, Sparkles } from "lucide-react";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { cn } from "@/lib/utils";

export type NexusFeedTab = "live" | "alpha" | "swap";

export function NexusFeedTabs({
  active,
  onChange,
  alphaCount,
}: {
  active: NexusFeedTab;
  onChange: (tab: NexusFeedTab) => void;
  alphaCount: number;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange("live")}
        className={cn(
          "arc-btn-pill flex items-center gap-1.5 px-3 py-2 text-sm font-semibold",
          active === "live" ? "arc-nav-pill-active text-emerald-50" : "text-white/50",
        )}
      >
        <ArcIconBadge icon={Radio} theme="nexus" size="sm" className="!h-6 !w-6" />
        Live Feed
      </button>
      <button
        type="button"
        onClick={() => onChange("alpha")}
        className={cn(
          "arc-btn-pill flex items-center gap-1.5 px-3 py-2 text-sm font-semibold",
          active === "alpha"
            ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
            : "text-white/50",
        )}
      >
        <ArcIconBadge icon={Sparkles} theme="home" size="sm" className="!h-6 !w-6" />
        Alpha ({alphaCount})
      </button>
      <button
        type="button"
        onClick={() => onChange("swap")}
        className={cn(
          "arc-btn-pill flex items-center gap-1.5 px-3 py-2 text-sm font-semibold",
          active === "swap"
            ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
            : "text-white/50",
        )}
      >
        <ArrowDownUp className="h-4 w-4" />
        Swap
      </button>
    </div>
  );
}
