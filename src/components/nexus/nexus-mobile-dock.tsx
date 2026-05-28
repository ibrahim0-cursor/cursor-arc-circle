"use client";

import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { cn } from "@/lib/utils";

export type NexusMobilePanel = "feed" | "chart" | "trade" | "portfolio";

const items: {
  id: NexusMobilePanel;
  label: string;
  icon: typeof NEXUS_TRADE_ICONS.chart;
  theme: "nexus" | "prism" | "home";
}[] = [
  { id: "feed", label: "Tokens", icon: NEXUS_TRADE_ICONS.holdings, theme: "nexus" },
  { id: "chart", label: "Chart", icon: NEXUS_TRADE_ICONS.chart, theme: "nexus" },
  { id: "trade", label: "Trade", icon: NEXUS_TRADE_ICONS.trade, theme: "nexus" },
  { id: "portfolio", label: "Portfolio", icon: NEXUS_TRADE_ICONS.portfolio, theme: "home" },
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
        {items.map(({ id, label, icon, theme }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-semibold transition",
              active === id ? "arc-nav-pill-active text-cyan-50" : "text-white/50 hover:text-white/80",
            )}
          >
            <ArcIcon3d
              icon={icon}
              theme={theme}
              size="sm"
              className={cn("!h-9 !w-9", active !== id && "opacity-75")}
            />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
