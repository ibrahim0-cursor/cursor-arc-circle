"use client";

import { ArrowDownUp, LineChart, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export type NexusMobilePanel = "feed" | "chart" | "trade";

const items: { id: NexusMobilePanel; label: string; icon: typeof Radio }[] = [
  { id: "feed", label: "Feed", icon: Radio },
  { id: "chart", label: "Chart", icon: LineChart },
  { id: "trade", label: "Trade", icon: ArrowDownUp },
];

export function NexusMobileDock({
  active,
  onChange,
}: {
  active: NexusMobilePanel;
  onChange: (panel: NexusMobilePanel) => void;
}) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[90] border-t border-cyan-400/25 bg-[#06060f]/98 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden"
      role="tablist"
      aria-label="NEXUS panels"
    >
      <div className="mx-auto flex max-w-lg items-center gap-1.5">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => onChange(id)}
            className={cn(
              "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border text-[11px] font-bold transition active:scale-95",
              active === id
                ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-100"
                : "border-transparent bg-white/[0.03] text-white/55",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
