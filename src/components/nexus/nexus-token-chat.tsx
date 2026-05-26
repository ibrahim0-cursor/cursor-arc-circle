"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { useAgentWallet } from "@/hooks/use-agent-wallet";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatAction = {
  type: string;
  usdcAmount?: number;
};

function tokenIntro(token: TrendingMarketToken) {
  const a = token.agent;
  return `I only discuss ${token.symbol}. Ask fundamentals, why ${a?.action ?? "HOLD"} ${a?.confidence ?? ""}%, risks, or say "buy $10", "sell", "autopilot every 15 min".`;
}

export function NexusTokenChatButton({
  token,
  onOpenTrade,
  className = "",
}: {
  token: TrendingMarketToken;
  onOpenTrade?: (tab: "buy" | "sell" | "agent") => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-violet-400/35 bg-violet-500/15 px-2.5 text-[11px] font-bold text-violet-100 transition hover:bg-violet-500/25 active:scale-95 ${className}`}
        aria-label={`Chat about ${token.symbol}`}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Chat
      </button>
      {open && (
        <NexusTokenChatPanel
          token={token}
          onClose={() => setOpen(false)}
          onOpenTrade={onOpenTrade}
        />
      )}
    </>
  );
}

export function NexusTokenChatPanel({
  token,
  onClose,
  onOpenTrade,
}: {
  token: TrendingMarketToken;
  onClose: () => void;
  onOpenTrade?: (tab: "buy" | "sell" | "agent") => void;
}) {
  const toast = useToast();
  const { isConnected } = useAccount();
  const { usdcBalance } = useAgentWallet();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: tokenIntro(token) },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: "assistant", content: tokenIntro(token) }]);
  }, [token.tokenAddress, token.chainId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/nexus/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          walletConnected: isConnected,
          agentBalanceUsdc: usdcBalance,
          token: {
            symbol: token.symbol,
            name: token.name,
            chainId: token.chainId,
            tokenAddress: token.tokenAddress,
            priceUsd: token.priceUsd,
            change24h: token.change24h,
            volume24h: token.volume24h,
            liquidityUsd: token.liquidityUsd,
            action: token.agent?.action,
            confidence: token.agent?.confidence,
            riskScore: token.agent?.riskScore,
            reasoning: token.agent?.whyAction ?? token.agent?.reasoning,
            securityGrade: token.security?.grade,
            securityLabel: token.security?.label,
            technical: token.intel?.technical,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);

      const action = data.action as ChatAction | null;
      if (action?.type === "buy") {
        onOpenTrade?.("buy");
        toast({ type: "success", title: "Buy tab", message: action.usdcAmount ? `Try $${action.usdcAmount} USDC` : "Set amount and confirm" });
      } else if (action?.type === "sell") onOpenTrade?.("sell");
      else if (action?.type === "autopilot" || action?.type === "deposit") onOpenTrade?.("agent");
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Sorry — ${e instanceof Error ? e.message : "error"}. Try again.` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, isConnected, usdcBalance, token, onOpenTrade, toast]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(520px,85vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-violet-400/35 bg-[#0a0f1a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Chat about ${token.symbol}`}
      >
        <div className="flex items-center gap-2 border-b border-violet-400/20 px-3 py-2.5">
          {token.icon ? (
            <img src={token.icon} alt="" className="h-9 w-9 rounded-lg border border-white/10" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/20 text-xs font-bold text-violet-100">
              {token.symbol.slice(0, 2)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{token.symbol} Copilot</p>
            <p className="truncate text-[10px] text-white/50">Fundamentals · TA · buy/sell help</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                m.role === "user" ? "ml-auto bg-violet-500/25 text-violet-50" : "bg-white/8 text-white/85"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <Bot className="h-3.5 w-3.5" />
              Researching {token.symbol}…
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-2">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
              placeholder={`Why ${token.symbol}? Or "buy $10"…`}
              className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white outline-none"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500 text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
