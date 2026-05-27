"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Flame,
  ChevronDown,
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
import { mergeFeedTokensStable } from "@/lib/token-security";
import { STABLE_FEED_LIMIT } from "@/lib/feed-config";
import { cn } from "@/lib/utils";
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
const MAX_FEED = STABLE_FEED_LIMIT;
const FEED_PREVIEW = 8;

function tokenAccent(symbol: string): number {
  return symbol.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function chainLabel(chainId: string): string {
  const id = chainId.toLowerCase();
  if (id === "base") return "Base";
  if (id === "arbitrum") return "ARB";
  if (id === "ethereum") return "ETH";
  if (id === "solana") return "SOL";
  return chainId.slice(0, 4).toUpperCase();
}

export function NexusTrendingFeed({
  selectedAddress,
  onSelect,
  onTokensRefresh,
  onOpenTrade,
  showAgent = true,
  compactDesktop = false,
  className,
}: {
  selectedAddress?: string;
  onSelect: (token: TrendingMarketToken, options?: { openChart?: boolean }) => void;
  onTokensRefresh?: (tokens: TrendingMarketToken[]) => void;
  onOpenTrade?: (tab: "buy" | "sell" | "agent") => void;
  showAgent?: boolean;
  /** Narrow left column: denser rows, less vertical scroll */
  compactDesktop?: boolean;
  className?: string;
}) {
  const [tokens, setTokens] = useState<TrendingMarketToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_MS / 1000);
  const [counts, setCounts] = useState({ buy: 0, sell: 0, hold: 0 });
  const [feedCycle, setFeedCycle] = useState(0);
  const [feedExpanded, setFeedExpanded] = useState(false);

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
      const merged = mergeFeedTokensStable(prev, list, MAX_FEED);
      onRefreshRef.current?.(merged);
      return merged;
    });
    if (!userPickedRef.current && !didInitialPick.current && list[0]) {
      didInitialPick.current = true;
      onSelectRef.current(list[0], { openChart: false });
    }
  }, []);

  const fetchFeed = useCallback(async (quick: boolean, timeoutMs: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const q = quick ? "&quick=1" : "";
    const lim = STABLE_FEED_LIMIT;
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
            ? "Feed timed out — tap Retry (server may be busy; not related to Supabase token)"
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
    onSelect(token, { openChart: true });
  }

  const hiddenCount = Math.max(0, tokens.length - FEED_PREVIEW);
  const showFeedToggle = hiddenCount > 0;
  const visibleTokens = feedExpanded ? tokens : tokens.slice(0, FEED_PREVIEW);

  function renderTokenRow(token: TrendingMarketToken) {
    const selected = selectedAddress?.toLowerCase() === token.tokenAddress.toLowerCase();
    const agent = token.agent;
    const sec = token.security;

    return (
      <motion.button
        key={`${token.chainId}:${token.tokenAddress}`}
        type="button"
        onClick={() => handleUserSelect(token)}
        className={cn(
          "w-full rounded-2xl border text-left transition-all duration-200 active:scale-[0.99] max-lg:min-h-[72px]",
          compactDesktop ? "p-2 lg:rounded-xl" : "p-3",
          selected
            ? "border-cyan-400/55 bg-gradient-to-br from-cyan-400/[0.12] to-violet-500/[0.06] ring-1 ring-cyan-400/35 shadow-[0_0_20px_-6px_rgba(34,211,238,0.35)]"
            : "border-white/10 bg-gradient-to-br from-black/30 to-white/[0.02] hover:border-cyan-400/25 hover:shadow-[0_0_16px_-8px_rgba(34,211,238,0.25)]",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {token.icon ? (
              <img
                src={token.icon}
                alt=""
                className={cn(
                  "shrink-0 rounded-xl border border-white/15 object-cover shadow-[0_0_12px_-4px_rgba(34,211,238,0.35)]",
                  compactDesktop ? "h-8 w-8 lg:h-7 lg:w-7" : "h-12 w-12 max-lg:h-11 max-lg:w-11",
                )}
              />
            ) : (
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-xl border border-white/10 font-bold text-cyan-100 shadow-inner",
                  compactDesktop ? "h-8 w-8 text-[9px]" : "h-10 w-10 text-[10px]",
                )}
                style={{
                  background: `linear-gradient(135deg, hsl(${(tokenAccent(token.symbol) % 360)} 65% 45% / 0.5), hsl(${((tokenAccent(token.symbol) + 50) % 360)} 60% 30% / 0.4))`,
                }}
              >
                {token.symbol.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                <span
                  className={cn(
                    "font-semibold",
                    compactDesktop ? "text-sm lg:text-[13px]" : "text-base max-lg:text-[15px]",
                  )}
                >
                  {token.symbol}
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/50">
                  {chainLabel(token.chainId)}
                </span>
                <NexusTokenChatButton
                  token={token}
                  onOpenTrade={onOpenTrade}
                  className="!min-h-[32px] shrink-0 !px-2 !py-1 !text-[10px] max-lg:!text-[9px]"
                />
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
                      sec.honeypotRisk || sec.scamRisk
                        ? "bg-rose-500/20 text-rose-200"
                        : sec.grade === "A" || sec.grade === "B"
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "bg-amber-500/15 text-amber-200"
                    }`}
                  >
                    {sec.honeypotRisk || sec.scamRisk ? (
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
              {!compactDesktop && <p className="text-xs text-white/45">{token.name}</p>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("font-medium", compactDesktop && "text-xs")}>{formatUsd(token.priceUsd)}</p>
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

        {(sec?.honeypotRisk || sec?.scamRisk) && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {sec.scamLabel ?? sec.label}
          </div>
        )}

        {agent && (
          <p
            className={cn(
              "mt-1 text-[11px] text-white/50 max-lg:text-xs",
              compactDesktop ? "line-clamp-1 lg:mt-0.5 lg:text-[10px]" : "mt-1.5 line-clamp-2",
            )}
          >
            <Bot className="mr-1 inline h-3 w-3 text-cyan-300/70" />
            <span className="font-medium text-cyan-200/90">{agent.confidence}% {agent.action}</span>
            {!compactDesktop && (
              <>
                {" · "}
                {agent.whyAction || agent.reasoning}
              </>
            )}
          </p>
        )}
        {token.intel?.technical && !compactDesktop && (
          <p className="mt-1 text-[10px] text-violet-200/70">
            RSI {token.intel.technical.rsi.toFixed(0)} · {token.intel.technical.trend.replace("_", " ")} · TA{" "}
            {token.intel.technical.score}/100
            {token.intel.technical.taSource === "birdeye_ohlcv" ? " · live candles" : ""}
          </p>
        )}

        <div
          className={cn(
            "mt-2 gap-2 text-[11px] max-lg:text-xs",
            compactDesktop
              ? "flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] lg:mt-1 lg:text-[9px]"
              : "grid grid-cols-2 lg:grid-cols-4 lg:gap-1 lg:text-[10px]",
          )}
        >
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
  }

  if (loading && tokens.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        Loading {STABLE_FEED_LIMIT} market tokens…
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
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-orange-400/30 bg-gradient-to-br from-orange-500/20 to-rose-500/10">
            <Flame className="h-4 w-4 text-orange-300" />
          </div>
          <h3 className="text-xs font-medium text-white/80 sm:text-sm">
            <span className="lg:hidden">{tokens.length} tokens · {secondsLeft}s</span>
            <span className="hidden lg:inline">
              {tokens.length} tokens (stable roster · max {MAX_FEED}) · refresh in {secondsLeft}s
            </span>
          </h3>
          {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {showAgent && (
            <>
              <Badge variant="buy" className="!text-[9px]">{counts.buy} B</Badge>
              <Badge variant="sell" className="!text-[9px]">{counts.sell} S</Badge>
              <Badge variant="hold" className="!text-[9px]">{counts.hold} H</Badge>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <p className="text-xs text-white/50 max-lg:hidden">
        New tokens merge in each refresh — your pick stays selected. Tap <strong className="text-violet-200">Chat</strong> on
        any token for help.
        {refreshing && <span className="ml-1 text-cyan-300"> Updating prices…</span>}
      </p>
      <p className="text-xs text-white/55 lg:hidden">
        Tap any token to open its chart. Bottom tabs: Tokens · Chart · Trade.
        {refreshing && <span className="ml-1 text-cyan-300"> Updating…</span>}
      </p>

      <div
        className={cn(
          "nexus-feed-scroll min-h-0 flex-1 space-y-1.5 overscroll-contain pr-1",
          compactDesktop || feedExpanded
            ? "overflow-y-auto pb-2"
            : "overflow-hidden pb-1 max-lg:overflow-hidden",
        )}
      >
        {visibleTokens.map((token) => renderTokenRow(token))}
      </div>

      {showFeedToggle && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px] w-full gap-2 border-white/15 bg-white/[0.03] text-sm text-white/80 hover:bg-white/[0.06]"
          onClick={() => setFeedExpanded((prev) => !prev)}
        >
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform duration-200", feedExpanded && "rotate-180")}
          />
          {feedExpanded ? "Show less" : `Show ${hiddenCount} more`}
        </Button>
      )}
    </div>
  );
}
