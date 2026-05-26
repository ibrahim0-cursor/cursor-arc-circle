"use client";

import { useCallback, useEffect, useState } from "react";
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
};

const REFRESH_MS = 45_000;

export function NexusTrendingFeed({
  selectedAddress,
  onSelect,
  showAgent = true,
}: {
  selectedAddress?: string;
  onSelect: (token: TrendingMarketToken) => void;
  showAgent?: boolean;
}) {
  const [tokens, setTokens] = useState<TrendingMarketToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [counts, setCounts] = useState({ buy: 0, sell: 0, hold: 0 });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/nexus/feed?limit=20&t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load feed");
      const list = (data.tokens ?? []) as TrendingMarketToken[];
      setTokens(list);
      setUpdatedAt(data.updatedAt ?? new Date().toISOString());
      setCounts(data.counts ?? { buy: 0, sell: 0, hold: 0 });
      if (list[0] && !selectedAddress) onSelect(list[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feed load failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onSelect, selectedAddress]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && tokens.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        NEXUS agent scanning DexScreener + Birdeye…
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
            {tokens.length} tokens · auto-refresh 45s
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
        <p className="text-[11px] text-white/35">
          Last updated {new Date(updatedAt).toLocaleTimeString()} · live like DexScreener
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

            <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-white/45">
              <span>Vol {formatCompact(token.volume24h)}</span>
              <span>Liq {formatCompact(token.liquidityUsd)}</span>
              <span>Snipers {token.intel?.sniperCount ?? "—"}</span>
              <span>Holders {token.intel?.holderCount ? formatCompact(token.intel.holderCount) : "—"}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
