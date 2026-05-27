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
}) {
  const panels: { id: NexusMobilePanel; label: string; icon: typeof LineChart }[] = [
    { id: "feed", label: "Tokens", icon: Radio },
    { id: "chart", label: "Chart", icon: LineChart },
    { id: "trade", label: "Trade", icon: ArrowDownUp },
  ];

  return (
    <div className="sticky top-14 z-40 -mx-4 border-b border-[var(--arc-border)] bg-[rgba(2,8,6,0.92)] px-3 py-2.5 backdrop-blur-xl sm:-mx-6 lg:hidden">
      {selectedToken ? (
        <div className="arc-glass-card arc-glass-card-nexus mb-2.5 flex items-center gap-3 px-3 py-2.5">
          {selectedToken.icon ? (
            <img src={selectedToken.icon} alt="" className="h-11 w-11 rounded-xl border border-white/10" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-sm font-bold text-cyan-100">
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

      <div className="flex gap-1.5">
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
        <button
          type="button"
          onClick={onMemoryScan}
          disabled={scanning || alphaScanning}
          className="flex min-h-[48px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] text-[9px] font-bold text-white/60"
          aria-label="Memory scan"
        >
          <Database className={cn("h-4 w-4", scanning && "animate-pulse text-cyan-300")} />
          Mem
        </button>
        <button
          type="button"
          onClick={onAlphaScan}
          disabled={scanning || alphaScanning}
          className="flex min-h-[48px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border border-violet-400/25 bg-violet-500/10 text-[9px] font-bold text-violet-100"
          aria-label="Alpha scan"
        >
          <Sparkles className={cn("h-4 w-4", alphaScanning && "animate-pulse")} />
          Alpha
        </button>
        <button
          type="button"
          onClick={onResearch}
          disabled={researching || !selectedToken}
          className="flex min-h-[48px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border border-violet-400/25 bg-violet-500/10 text-[9px] font-bold text-violet-100 disabled:opacity-40"
          aria-label="Deep research"
        >
          <Brain className={cn("h-4 w-4", researching && "animate-pulse")} />
          AI
        </button>
      </div>
    </div>
  );
}
