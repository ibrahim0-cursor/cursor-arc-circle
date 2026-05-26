"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Flame,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";
import { NexusTokenChatButton } from "@/components/nexus/nexus-token-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCompact, formatPct, formatUsd } from "@/lib/utils";
import { mergeFeedTokens } from "@/lib/token-security";
import type { TokenIntel } from "@/lib/storage";
import type { AgentSignal } from "@/lib/storage";
import type { TokenSecurityReport } from "@/lib/token-security";

export type TrendingMarketToken = {
  symbol: string;
  name: string;
  tokenAddress: string;
  chainId: string;
  pairAddress: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidityUsd: number;
  icon?: string;
  url: string;
  intel?: TokenIntel;
  demoTradeable?: boolean;
  suggestedNetwork?: string;
  txns24h?: { buys: number; sells: number };
  agent?: AgentSignal;
  security?: TokenSecurityReport;
  updatedAt?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
};

const REFRESH_MS = 45_000;
const MAX_FEED = 120;

export function NexusTrendingFeed({
  selectedAddress,
  onSelect,
  onTokensRefresh,
  onOpenTrade,
  showAgent = true,
}: {
  selectedAddress?: string;
  onSelect: (token: TrendingMarketToken) => void;
  onTokensRefresh?: (tokens: TrendingMarketToken[]) => void;
  onOpenTrade?: (tab: "buy" | "sell" | "agent") => void;
  showAgent?: boolean;
}) {
  const [tokens, setTokens] = useState<TrendingMarketToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_MS / 1000);
  const [counts, setCounts] = useState({ buy: 0, sell: 0, hold: 0 });
  const [feedCycle, setFeedCycle] = useState(0);

  const onSelectRef = useRef(onSelect);
  const onRefreshRef = useRef(onTokensRefresh);
  const selectedAddressRef = useRef(selectedAddress);
  const didInitialPick = useRef(false);
  const userPickedRef = useRef(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    onRefreshRef.current = onTokensRefresh;
  }, [onTokensRefresh]);
  useEffect(() => {
    selectedAddressRef.current = selectedAddress;
  }, [selectedAddress]);

  const applyFeed = useCallback((list: TrendingMarketToken[], data: { feedCycle?: number; updatedAt?: string; counts?: typeof counts }) => {
    setFeedCycle(data.feedCycle ?? 0);
    setUpdatedAt(data.updatedAt ?? new Date().toISOString());
    setCounts(data.counts ?? { buy: 0, sell: 0, hold: 0 });
    setSecondsLeft(REFRESH_MS / 1000);
    setError(null);
    setTokens((prev) => {
      const merged = mergeFeedTokens(prev, list, MAX_FEED);
      onRefreshRef.current?.(merged);
      return merged;
    });
    if (!userPickedRef.current && !didInitialPick.current && list[0]) {
      didInitialPick.current = true;
      onSelectRef.current(list[0]);
    }
  }, []);

  const fetchFeed = useCallback(async (quick: boolean, timeoutMs: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const q = quick ? "&quick=1" : "";
    const lim = quick ? 50 : 60;
    try {
      const res = await fetch(`/api/nexus/feed?limit=${lim}${q}&t=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load feed");
      return { list: (data.tokens ?? []) as TrendingMarketToken[], data };
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const { list, data } = await fetchFeed(true, 28_000);
        applyFeed(list, data);
        if (!silent) {
          void (async () => {
            try {
              const full = await fetchFeed(false, 52_000);
              applyFeed(full.list, full.data);
            } catch {
              /* keep quick feed */
            }
          })();
        }
      } catch (err) {
        const msg =
          err instanceof Error && err.name === "AbortError"
            ? "Feed timed out — retry or check Vercel function limits"
            : err instanceof Error
              ? err.message
              : "Feed load failed";
        if (!silent) setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyFeed, fetchFeed],
  );

  useEffect(() => {
    load();
    const refreshInterval = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(refreshInterval);
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? REFRESH_MS / 1000 : s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  function handleUserSelect(token: TrendingMarketToken) {
    userPickedRef.current = true;
    onSelect(token);
  }

  if (loading && tokens.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        NEXUS scanning 100+ tokens…
      </div>
    );
  }

  if (error && tokens.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6 text-sm text-rose-200">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={() => load()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Retry feed
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-300" />
          <h3 className="text-sm font-medium text-white/80">
            {tokens.length} tokens (max {MAX_FEED}) · cycle #{feedCycle} · {secondsLeft}s
          </h3>
          {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />}
        </div>
        <div className="flex items-center gap-2">
          {showAgent && (
            <>
              <Badge variant="buy">{counts.buy} BUY</Badge>
              <Badge variant="sell">{counts.sell} SELL</Badge>
              <Badge variant="hold">{counts.hold} HOLD</Badge>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-white/50">
        New tokens merge in each refresh — your pick stays selected. Tap <strong className="text-violet-200">Chat</strong> on
        any token for help.
        {refreshing && <span className="ml-1 text-cyan-300"> Updating prices…</span>}
      </p>

      <div className="max-h-[min(62vh,720px)] space-y-2 overflow-y-auto pr-1">
      {tokens.map((token) => {
        const selected = selectedAddress?.toLowerCase() === token.tokenAddress.toLowerCase();
        const agent = token.agent;
        const sec = token.security;

        return (
          <motion.button
            key={`${token.chainId}:${token.tokenAddress}`}
            type="button"
            onClick={() => handleUserSelect(token)}
            layout
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selected
                ? "border-cyan-400/50 bg-cyan-400/[0.08] ring-1 ring-cyan-400/30"
                : "border-white/10 bg-black/20 hover:border-white/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {token.icon ? (
                  <img src={token.icon} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-white/10" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-xs font-bold text-cyan-200">
                    {token.symbol.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{token.symbol}</span>
                    <NexusTokenChatButton token={token} onOpenTrade={onOpenTrade} className="!min-h-[32px] !px-2 !py-1" />
                    {agent && (
                      <Badge
                        variant={
                          agent.action === "BUY" ? "buy" : agent.action === "SELL" ? "sell" : "hold"
                        }
                      >
                        {agent.action}
                      </Badge>
                    )}
                    {sec && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          sec.honeypotRisk
                            ? "bg-rose-500/20 text-rose-200"
                            : sec.grade === "A" || sec.grade === "B"
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-amber-500/15 text-amber-200"
                        }`}
                      >
                        {sec.honeypotRisk ? (
                          <ShieldAlert className="h-3 w-3" />
                        ) : sec.grade === "A" || sec.grade === "B" ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <Shield className="h-3 w-3" />
                        )}
                        {sec.grade} · {sec.score}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/45">{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatUsd(token.priceUsd)}</p>
                <p
                  className={`flex items-center justify-end gap-1 text-xs ${token.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                >
                  {token.change24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {formatPct(token.change24h)}
                </p>
              </div>
            </div>

            {sec?.honeypotRisk && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {sec.label}
              </div>
            )}

            {agent && (
              <div className="mt-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cyan-200/60">
                  <Bot className="h-3 w-3" />
                  NEXUS · {agent.confidence}% · RSI/MACD
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/65">{agent.whyAction}</p>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <span className="flex items-center gap-1 text-white/55">
                <Waves className="h-3 w-3 text-cyan-300/70" />
                Vol {formatCompact(token.volume24h)}
              </span>
              <span className="flex items-center gap-1 text-white/55">
                <BarChart3 className="h-3 w-3 text-violet-300/70" />
                Liq {formatCompact(token.liquidityUsd)}
              </span>
              <span className="flex items-center gap-1 font-medium text-emerald-300">
                <TrendingUp className="h-3 w-3" />
                Buys {token.txns24h?.buys ?? "—"}
              </span>
              <span className="flex items-center gap-1 font-medium text-rose-300">
                <TrendingDown className="h-3 w-3" />
                Sells {token.txns24h?.sells ?? "—"}
              </span>
            </div>
          </motion.button>
        );
      })}
      </div>
    </div>
  );
}
