"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Flame, Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCompact, formatPct, formatUsd } from "@/lib/utils";
import type { TokenIntel } from "@/lib/storage";
import type { AgentSignal } from "@/lib/storage";

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
  updatedAt?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
};

const REFRESH_MS = 45_000;

export function NexusTrendingFeed({
  selectedAddress,
  onSelect,
  onTokensRefresh,
  showAgent = true,
}: {
  selectedAddress?: string;
  onSelect: (token: TrendingMarketToken) => void;
  /** Called on every refresh so parent can update selected token prices in-place */
  onTokensRefresh?: (tokens: TrendingMarketToken[]) => void;
  showAgent?: boolean;
}) {
  const [tokens, setTokens] = useState<TrendingMarketToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_MS / 1000);
  const [counts, setCounts] = useState({ buy: 0, sell: 0, hold: 0 });

  const onSelectRef = useRef(onSelect);
  const onRefreshRef = useRef(onTokensRefresh);
  const selectedAddressRef = useRef(selectedAddress);
  const didInitialSelect = useRef(false);
  const [feedCycle, setFeedCycle] = useState(0);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onRefreshRef.current = onTokensRefresh;
  }, [onTokensRefresh]);

  useEffect(() => {
    selectedAddressRef.current = selectedAddress;
  }, [selectedAddress]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/nexus/feed?limit=20&t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load feed");
      const list = (data.tokens ?? []) as TrendingMarketToken[];
      const cycle = data.feedCycle ?? 0;
      setFeedCycle(cycle);
      setTokens(list);
      setUpdatedAt(data.updatedAt ?? new Date().toISOString());
      setCounts(data.counts ?? { buy: 0, sell: 0, hold: 0 });
      setSecondsLeft(REFRESH_MS / 1000);
      setError(null);
      onRefreshRef.current?.(list);

      const sel = selectedAddressRef.current?.toLowerCase();
      const match = sel
        ? list.find((t) => t.tokenAddress.toLowerCase() === sel)
        : null;

      if (match) {
        onSelectRef.current(match);
      } else if (!didInitialSelect.current && list[0]) {
        didInitialSelect.current = true;
        onSelectRef.current(list[0]);
      } else if (list[0] && sel && !match) {
        onSelectRef.current(list[0]);
      }
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Feed load failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  if (loading && tokens.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        NEXUS agent scanning DexScreener…
      </div>
    );
  }

  if (error && tokens.length === 0) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-300" />
          <h3 className="text-sm font-medium text-white/80">
            {tokens.length} tokens · cycle #{feedCycle} · {secondsLeft}s
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

      {updatedAt && (
        <p className="text-[11px] text-white/50">
          Updated {new Date(updatedAt).toLocaleTimeString()} · DexScreener rotates queries each refresh
          {refreshing && <span className="ml-1 text-cyan-300"> · loading new tokens…</span>}
        </p>
      )}

      {tokens.map((token) => {
        const selected = selectedAddress?.toLowerCase() === token.tokenAddress.toLowerCase();
        const agent = token.agent;

        return (
          <motion.button
            key={`${token.chainId}:${token.tokenAddress}`}
            type="button"
            onClick={() => onSelect(token)}
            layout
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selected
                ? "border-cyan-400/50 bg-cyan-400/[0.08]"
                : "border-white/10 bg-black/20 hover:border-white/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {token.icon ? (
                  <img src={token.icon} alt="" className="h-10 w-10 rounded-xl border border-white/10" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-xs font-bold text-cyan-200">
                    {token.symbol.slice(0, 2)}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{token.symbol}</span>
                    {agent && (
                      <Badge
                        variant={
                          agent.action === "BUY" ? "buy" : agent.action === "SELL" ? "sell" : "hold"
                        }
                      >
                        {agent.action}
                      </Badge>
                    )}
                    <Badge variant="nexus" className="normal-case tracking-normal text-[10px]">
                      Arc
                    </Badge>
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

            {agent && (
              <div className="mt-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cyan-200/60">
                  <Bot className="h-3 w-3" />
                  NEXUS agent · {agent.confidence}% confidence
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/65">
                  {agent.whyAction}
                </p>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/60 sm:grid-cols-4">
              <span>Vol {formatCompact(token.volume24h)}</span>
              <span>Liq {formatCompact(token.liquidityUsd)}</span>
              <span className="text-emerald-300/80">
                Buys {token.txns24h?.buys ?? "—"} <span className="text-white/35">(Dex)</span>
              </span>
              <span className="text-rose-300/80">
                Sells {token.txns24h?.sells ?? "—"} <span className="text-white/35">(Dex)</span>
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
