"use client";

import { useState } from "react";
import { MessageCircle, TrendingDown, TrendingUp } from "lucide-react";
import { NexusTokenChatPanel } from "@/components/nexus/nexus-token-chat";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export function NexusMobileTokenActions({
  token,
  onTradeTab,
}: {
  token: TrendingMarketToken;
  onTradeTab: (tab: "buy" | "sell" | "agent") => void;
}) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-violet-400/35 bg-violet-500/15 text-[11px] font-bold text-violet-100 active:scale-[0.98]"
        >
          <MessageCircle className="h-5 w-5" />
          Chat
        </button>
        <button
          type="button"
          onClick={() => onTradeTab("buy")}
          className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 text-[11px] font-bold text-emerald-100 active:scale-[0.98]"
        >
          <TrendingUp className="h-5 w-5" />
          Buy
        </button>
        <button
          type="button"
          onClick={() => onTradeTab("sell")}
          className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-rose-400/35 bg-rose-500/15 text-[11px] font-bold text-rose-100 active:scale-[0.98]"
        >
          <TrendingDown className="h-5 w-5" />
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
