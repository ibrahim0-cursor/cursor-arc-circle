"use client";

import { ArrowDownUp, Bot, LineChart, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export type NexusMobilePanel = "feed" | "chart" | "trade" | "agent";

const items: { id: NexusMobilePanel; label: string; icon: typeof Radio }[] = [
  { id: "feed", label: "Feed", icon: Radio },
  { id: "chart", label: "Chart", icon: LineChart },
  { id: "trade", label: "Trade", icon: ArrowDownUp },
  { id: "agent", label: "Agent", icon: Bot },
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
      className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-[85] border-t border-cyan-400/20 bg-[#0a0a14]/95 px-2 py-2 backdrop-blur-xl lg:hidden"
      role="tablist"
      aria-label="NEXUS panels"
    >
      <div className="mx-auto flex max-w-lg items-center gap-1">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => onChange(id)}
            className={cn(
              "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-bold transition active:scale-95",
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
