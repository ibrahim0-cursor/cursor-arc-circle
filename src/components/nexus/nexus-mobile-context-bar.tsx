"use client";

import {
  ArrowDownUp,
  LineChart,
  Radio,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { formatPct, formatUsd } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import type { NexusMobilePanel } from "@/components/nexus/nexus-mobile-dock";
import { cn } from "@/lib/utils";

export function NexusMobileContextBar({
  selectedToken,
  activePanel,
  onPanelChange,
}: {
  selectedToken: TrendingMarketToken | null;
  activePanel: NexusMobilePanel;
  onPanelChange: (p: NexusMobilePanel) => void;
}) {
  const panels: { id: NexusMobilePanel; label: string; icon: typeof LineChart }[] = [
    { id: "feed", label: "Tokens", icon: Radio },
    { id: "chart", label: "Chart", icon: LineChart },
    { id: "trade", label: "Trade", icon: ArrowDownUp },
    { id: "portfolio", label: "Portfolio", icon: Wallet },
  ];

  return (
    <div className="sticky top-14 z-40 -mx-4 border-b border-[var(--arc-border)] bg-[rgba(2,8,6,0.94)] px-3 py-2.5 backdrop-blur-xl sm:-mx-6 lg:hidden">
      {selectedToken ? (
        <div className="arc-glass-card arc-glass-card-nexus mb-2.5 flex items-center gap-3 px-3 py-2.5">
          <NexusTokenAvatar symbol={selectedToken.symbol} icon={selectedToken.icon} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-white">{selectedToken.symbol}</span>
              {selectedToken.agent && (
                <Badge
                  variant={
                    selectedToken.agent.action === "BUY"
                      ? "buy"
                      : selectedToken.agent.action === "SELL"
                        ? "sell"
                        : "hold"
                  }
                  className="!text-[10px]"
                >
                  {selectedToken.agent.action}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-white/90">{formatUsd(selectedToken.priceUsd)}</span>
              <span
                className={cn(
                  "flex items-center gap-0.5 font-semibold",
                  selectedToken.change24h >= 0 ? "text-emerald-300" : "text-rose-300",
                )}
              >
                {selectedToken.change24h >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {formatPct(selectedToken.change24h)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <p className="arc-signal-panel arc-signal-panel-nexus mb-2.5 px-3 py-2.5 text-center text-sm text-white/55">
          Tap a token in <strong className="text-emerald-200">Tokens</strong> to see chart &amp; trade
        </p>
      )}

      <div className="mb-2.5 flex gap-1.5">
        {panels.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPanelChange(id)}
            className={cn(
              "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border text-[11px] font-bold transition active:scale-[0.98]",
              activePanel === id
                ? "arc-nav-pill-active border-emerald-400/35 text-emerald-50"
                : "arc-glass-interactive border-[var(--arc-border)] text-white/55",
            )}
          >
            <Icon className={cn("h-5 w-5", activePanel === id && "text-emerald-300")} />
            {label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-center text-[10px] text-white/45">
        Tokens tab: <strong className="text-emerald-200/90">Live Feed</strong> · Alpha · Swap
      </p>
    </div>
  );
}
