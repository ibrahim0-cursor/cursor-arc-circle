"use client";

import { ArrowDownUp, LineChart, Radio, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type NexusMobilePanel = "feed" | "chart" | "trade" | "portfolio";

const items: { id: NexusMobilePanel; label: string; icon: typeof Radio }[] = [
  { id: "feed", label: "Tokens", icon: Radio },
  { id: "chart", label: "Chart", icon: LineChart },
  { id: "trade", label: "Trade", icon: ArrowDownUp },
  { id: "portfolio", label: "Portfolio", icon: Wallet },
];

export function NexusMobileDock({
  active,
  onChange,
}: {
  active: NexusMobilePanel;
  onChange: (panel: NexusMobilePanel) => void;
}) {
  return (
    <nav
      className="arc-nav-glass fixed bottom-3 left-3 right-3 z-[90] rounded-2xl pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
      role="tablist"
      aria-label="NEXUS panels"
    >
      <div className="flex items-stretch justify-around gap-0.5 px-1 py-1">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-semibold transition",
              active === id ? "arc-nav-pill-active text-emerald-50" : "text-white/50 hover:text-white/80",
            )}
          >
            <Icon className={cn("h-5 w-5", active === id && "text-emerald-300")} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
