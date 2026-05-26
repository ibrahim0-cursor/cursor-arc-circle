"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCompact, formatPct, formatUsd } from "@/lib/utils";
import { mirrorTestnetForSource, DEMO_TRADE_NETWORKS } from "@/lib/testnet-chains";
import type { TokenIntel } from "@/lib/storage";

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
};

export function NexusTrendingFeed({
  selectedAddress,
  onSelect,
}: {
  selectedAddress?: string;
  onSelect: (token: TrendingMarketToken) => void;
}) {
  const [tokens, setTokens] = useState<TrendingMarketToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/nexus/trending");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load trending");
        setTokens(data.tokens ?? []);
        if (data.tokens?.[0] && !selectedAddress) onSelect(data.tokens[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Trending load failed");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [onSelect, selectedAddress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        Loading DexScreener + Birdeye trending…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-300" />
          <h3 className="text-sm font-medium text-white/80">Trending · live market data</h3>
        </div>
        <Badge variant="nexus">Testnet demo</Badge>
      </div>

      {tokens.map((token) => {
        const network = DEMO_TRADE_NETWORKS.find(
          (n) => n.id === (token.suggestedNetwork ?? mirrorTestnetForSource(token.chainId)),
        );
        const selected = selectedAddress?.toLowerCase() === token.tokenAddress.toLowerCase();

        return (
          <motion.button
            key={`${token.chainId}:${token.tokenAddress}`}
            type="button"
            onClick={() => onSelect(token)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
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
                    <Badge variant="default" className="normal-case tracking-normal border border-white/20 text-[10px]">
                      {token.chainId} feed
                    </Badge>
                    <Badge variant="nexus" className="normal-case tracking-normal text-[10px]">
                      Demo on {network?.short ?? "Arc"}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/45">{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatUsd(token.priceUsd)}</p>
                <p className={`flex items-center justify-end gap-1 text-xs ${token.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {token.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatPct(token.change24h)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-white/45">
              <span>Vol {formatCompact(token.volume24h)}</span>
              <span>Liq {formatCompact(token.liquidityUsd)}</span>
              <span>
                {token.intel?.holderCount ? `${formatCompact(token.intel.holderCount)} holders` : "Birdeye intel"}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
