"use client";

import {
  ArrowDownUp,
  Brain,
  Database,
  LineChart,
  Radio,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NexusScanActions } from "@/components/nexus/nexus-scan-actions";
import { formatPct, formatUsd } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import type { NexusMobilePanel } from "@/components/nexus/nexus-mobile-dock";
import { cn } from "@/lib/utils";

export function NexusMobileContextBar({
  selectedToken,
  activePanel,
  onPanelChange,
  onMemoryScan,
  onAlphaScan,
  onResearch,
  scanning,
  alphaScanning,
  researching,
  arcFeePending,
}: {
  selectedToken: TrendingMarketToken | null;
  activePanel: NexusMobilePanel;
  onPanelChange: (p: NexusMobilePanel) => void;
  onMemoryScan: () => void;
  onAlphaScan: () => void;
  onResearch: () => void;
  scanning?: boolean;
  alphaScanning?: boolean;
  researching?: boolean;
  arcFeePending?: boolean;
}) {
  const panels: { id: NexusMobilePanel; label: string; icon: typeof LineChart }[] = [
    { id: "feed", label: "Tokens", icon: Radio },
    { id: "chart", label: "Chart", icon: LineChart },
    { id: "trade", label: "Trade", icon: ArrowDownUp },
  ];

  return (
    <div className="sticky top-14 z-40 -mx-4 border-b border-[var(--arc-border)] bg-[rgba(2,8,6,0.94)] px-3 py-2.5 backdrop-blur-xl sm:-mx-6 lg:hidden">
      {selectedToken ? (
        <div className="arc-glass-card arc-glass-card-nexus mb-2.5 flex items-center gap-3 px-3 py-2.5">
          {selectedToken.icon ? (
            <div className="nexus-token-avatar-frame h-11 w-11">
              <img src={selectedToken.icon} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="nexus-token-avatar-frame flex h-11 w-11 items-center justify-center text-sm font-bold text-emerald-100">
              {selectedToken.symbol.slice(0, 2)}
            </div>
          )}
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

      <NexusScanActions
        compact
        className="mb-0"
        actions={[
          {
            id: "memory",
            label: "Memory Scan",
            icon: Database,
            onClick: onMemoryScan,
            disabled: scanning || alphaScanning || arcFeePending,
            loading: scanning || arcFeePending,
          },
          {
            id: "alpha",
            label: "Alpha Scan",
            icon: Sparkles,
            onClick: onAlphaScan,
            disabled: scanning || alphaScanning || arcFeePending,
            loading: alphaScanning,
            pulse: alphaScanning,
          },
          {
            id: "research",
            label: "Deep Research",
            icon: Brain,
            onClick: onResearch,
            disabled: researching || arcFeePending || !selectedToken,
            loading: researching,
          },
        ]}
      />
    </div>
  );
}
