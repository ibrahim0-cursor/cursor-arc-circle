"use client";

import { ArrowDownUp, LineChart, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export type NexusMobilePanel = "feed" | "chart" | "trade";

const items: { id: NexusMobilePanel; label: string; icon: typeof Radio }[] = [
  { id: "feed", label: "Tokens", icon: Radio },
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
      className="fixed bottom-0 left-0 right-0 z-[90] border-t border-cyan-400/30 bg-[#06060f]/98 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden"
      role="tablist"
      aria-label="NEXUS panels"
    >
      <div className="mx-auto flex max-w-lg items-stretch gap-2">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-xs font-bold transition active:scale-[0.97]",
              active === id
                ? "border-cyan-400/50 bg-cyan-500/25 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                : "border-transparent bg-white/[0.05] text-white/50",
            )}
          >
            {active === id && (
              <span className="absolute top-1.5 h-1 w-8 rounded-full bg-cyan-400" aria-hidden />
            )}
            <Icon className="h-6 w-6" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
