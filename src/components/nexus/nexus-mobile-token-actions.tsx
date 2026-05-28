"use client";

import { useState } from "react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { NexusTokenChatPanel } from "@/components/nexus/nexus-token-chat";
import { cn } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export function NexusMobileTokenActions({
  token,
  onTradeTab,
  onOpenAutopilot,
}: {
  token: TrendingMarketToken;
  onTradeTab: (tab: "buy" | "sell" | "agent") => void;
  onOpenAutopilot?: () => void;
}) {
  const [chatOpen, setChatOpen] = useState(false);

  const openAutopilot = () => {
    onOpenAutopilot?.();
    onTradeTab("agent");
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2 lg:hidden">
        <button
          type="button"
          onClick={openAutopilot}
          className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-violet-400/45 bg-gradient-to-b from-violet-600/30 to-fuchsia-600/20 text-[10px] font-bold text-violet-50 active:scale-[0.98]"
        >
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.autopilot} theme="home" size="sm" className="!h-8 !w-8" />
          Autopilot
        </button>
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
          className={cn(
            "flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-rose-400/35 bg-rose-500/15 text-[10px] font-bold text-rose-100 active:scale-[0.98]",
          )}
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
