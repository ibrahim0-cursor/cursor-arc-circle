"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { formatPct, formatUsd } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { cn } from "@/lib/utils";

export function NexusMobileContextBar({
  selectedToken,
}: {
  selectedToken: TrendingMarketToken | null;
}) {
  return (
    <div className="sticky top-14 z-40 -mx-4 border-b border-[var(--arc-border)] bg-[rgba(2,8,6,0.94)] px-3 py-2.5 backdrop-blur-xl sm:-mx-6 lg:hidden">
      {selectedToken ? (
        <div className="arc-glass-card arc-glass-card-nexus flex items-center gap-3 px-3 py-2.5">
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
        <p className="arc-signal-panel arc-signal-panel-nexus px-3 py-2.5 text-center text-sm text-white/55">
          Tap a token below to view chart &amp; trade
        </p>
      )}
    </div>
  );
}
