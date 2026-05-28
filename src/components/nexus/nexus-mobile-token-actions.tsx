"use client";

import { useState } from "react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { cn } from "@/lib/utils";
import { NexusTokenChatPanel } from "@/components/nexus/nexus-token-chat";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export function NexusMobileTokenActions({
  token,
  onTradeTab,
  onExpandChart,
}: {
  token: TrendingMarketToken;
  onTradeTab: (tab: "buy" | "sell" | "agent") => void;
  onExpandChart?: () => void;
}) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "grid gap-2 lg:hidden",
          onExpandChart ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        {onExpandChart && (
          <button
            type="button"
            onClick={onExpandChart}
            className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-cyan-400/35 bg-cyan-500/15 text-[10px] font-bold text-cyan-100 active:scale-[0.98]"
          >
            <ArcIcon3d icon={NEXUS_TRADE_ICONS.chart} theme="nexus" size="sm" className="!h-8 !w-8" />
            Chart
          </button>
        )}
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-violet-400/35 bg-violet-500/15 text-[10px] font-bold text-violet-100 active:scale-[0.98]"
        >
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.chat} theme="nexus" size="sm" className="!h-8 !w-8" />
          Chat
        </button>
        <button
          type="button"
          onClick={() => onTradeTab("buy")}
          className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 text-[10px] font-bold text-emerald-100 active:scale-[0.98]"
        >
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.buy} theme="nexus" size="sm" className="!h-8 !w-8" />
          Buy
        </button>
        <button
          type="button"
          onClick={() => onTradeTab("sell")}
          className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-rose-400/35 bg-rose-500/15 text-[10px] font-bold text-rose-100 active:scale-[0.98]"
        >
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.sell} theme="prism" size="sm" className="!h-8 !w-8" />
          Sell
        </button>
      </div>
      {chatOpen && (
        <NexusTokenChatPanel
          token={token}
          onClose={() => setChatOpen(false)}
          onOpenTrade={(tab) => {
            setChatOpen(false);
            onTradeTab(tab);
          }}
        />
      )}
    </>
  );
}
