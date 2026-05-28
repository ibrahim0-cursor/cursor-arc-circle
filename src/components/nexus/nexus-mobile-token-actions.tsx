"use client";

import { useState } from "react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { nexusActionGlass } from "@/lib/nexus-action-glass";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { NexusTokenChatPanel } from "@/components/nexus/nexus-token-chat";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export function NexusMobileTokenActions({
  token,
  onTradeTab,
  onOpenAutopilot,
  activeTab = "buy",
}: {
  token: TrendingMarketToken;
  onTradeTab: (tab: "buy" | "sell" | "agent") => void;
  onOpenAutopilot?: () => void;
  activeTab?: "buy" | "sell" | "agent";
}) {
  const [chatOpen, setChatOpen] = useState(false);

  const openAutopilot = () => {
    onOpenAutopilot?.();
    onTradeTab("agent");
  };

  const chip =
    "relative z-[1] flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 active:scale-[0.98]";

  return (
    <>
      <div className="grid grid-cols-4 gap-2 lg:hidden">
        <button type="button" onClick={openAutopilot} className={nexusActionGlass("autopilot", activeTab === "agent", chip)}>
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.autopilot} theme="home" size="sm" className="!h-8 !w-8" />
          <span className="text-[10px] font-bold">Autopilot</span>
        </button>
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className={nexusActionGlass("alpha", false, chip)}
        >
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.chat} theme="nexus" size="sm" className="!h-8 !w-8" />
          <span className="text-[10px] font-bold">Chat</span>
        </button>
        <button type="button" onClick={() => onTradeTab("buy")} className={nexusActionGlass("buy", activeTab === "buy", chip)}>
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.buy} theme="nexus" size="sm" className="!h-8 !w-8" />
          <span className="text-[10px] font-bold">Buy</span>
        </button>
        <button type="button" onClick={() => onTradeTab("sell")} className={nexusActionGlass("sell", activeTab === "sell", chip)}>
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.sell} theme="prism" size="sm" className="!h-8 !w-8" />
          <span className="text-[10px] font-bold">Sell</span>
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
