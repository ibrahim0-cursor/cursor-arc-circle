"use client";

import { ArrowDownUp, Radio, Sparkles } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
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
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange("live")}
        className={cn(
          "arc-glass-interactive arc-btn-pill flex items-center gap-2 px-3 py-2 text-sm font-semibold",
          active === "live" ? "arc-nav-pill-active text-emerald-50" : "text-white/50",
        )}
      >
        <ArcIcon3d icon={Radio} theme="nexus" size="sm" />
        Live Feed
      </button>
      <button
        type="button"
        onClick={() => onChange("alpha")}
        className={cn(
          "arc-glass-interactive arc-btn-pill flex items-center gap-2 px-3 py-2 text-sm font-semibold",
          active === "alpha"
            ? "arc-nav-pill-active border-violet-400/40 text-violet-100"
            : "text-white/50",
        )}
      >
        <ArcIcon3d icon={Sparkles} theme="nexus" size="sm" delay={0.1} />
        Alpha ({alphaCount})
      </button>
      <button
        type="button"
        onClick={() => onChange("swap")}
        className={cn(
          "arc-glass-interactive arc-btn-pill flex items-center gap-2 px-3 py-2 text-sm font-semibold",
          active === "swap" ? "arc-nav-pill-active text-cyan-100" : "text-white/50",
        )}
      >
        <ArcIcon3d icon={ArrowDownUp} theme="nexus" size="sm" delay={0.2} />
        Swap
      </button>
    </div>
  );
}
