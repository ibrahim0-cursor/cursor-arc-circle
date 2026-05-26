"use client";

import { useEffect, useState } from "react";
import { Crosshair, Fish, Loader2, Radar, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCompact, formatUsd, truncateHash } from "@/lib/utils";
import type { TokenTx, TokenWhale } from "@/lib/storage";

type Detection = {
  trades: TokenTx[];
  whales: TokenWhale[];
  snipers: Array<{ address: string; label: string }>;
  summary: {
    sniperCount?: number;
    whaleCount?: number;
    top10Pct?: number;
    buy24h?: number;
    sell24h?: number;
    holderCount?: number;
  };
};

export function NexusTokenDetectPanel({
  chainId,
  tokenAddress,
  symbol,
  txns24h,
  volume24h,
}: {
  chainId?: string;
  tokenAddress?: string;
  symbol?: string;
  txns24h?: { buys: number; sells: number };
  volume24h?: number;
}) {
  const [tab, setTab] = useState<"txs" | "snipers" | "whales">("txs");
  const [data, setData] = useState<Detection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chainId || !tokenAddress) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          chainId: chainId!,
          address: tokenAddress!,
          buys: String(txns24h?.buys ?? 0),
          sells: String(txns24h?.sells ?? 0),
          volume: String(volume24h ?? 0),
        });
        const res = await fetch(`/api/nexus/token/detect?${params}`);
        const json = await res.json();
        if (!cancelled && res.ok) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [chainId, tokenAddress, txns24h?.buys, txns24h?.sells, volume24h]);

  if (!chainId || !tokenAddress) {
    return (
      <Card className="border-white/10">
        <CardContent className="py-8 text-center text-sm text-white/50">
          Select a token to detect snipers, whales, and live txs
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-violet-400/20 bg-gradient-to-b from-violet-400/[0.05] to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-violet-300" />
            <div>
              <h2 className="text-lg font-medium">Token Detect</h2>
              <p className="text-xs text-white/45">{symbol} · Birdeye + DexScreener flow</p>
            </div>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <Badge variant="nexus">{data?.summary.sniperCount ?? 0} snipers</Badge>
          <Badge variant="default" className="border border-violet-400/30 bg-violet-400/10">
            {data?.summary.whaleCount ?? 0} whales
          </Badge>
          {data?.summary.top10Pct !== undefined && (
            <Badge variant="default" className="border border-amber-400/30 bg-amber-400/10 text-amber-200">
              Top 10 hold {data.summary.top10Pct.toFixed(1)}%
            </Badge>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          {(
            [
              { id: "txs" as const, label: "Live Txs", icon: Target },
              { id: "snipers" as const, label: "Snipers", icon: Crosshair },
              { id: "whales" as const, label: "Whales", icon: Fish },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${
                tab === id ? "bg-violet-400/15 text-violet-100" : "text-white/50 hover:text-white/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="max-h-64 space-y-2 overflow-y-auto">
        {tab === "txs" &&
          (data?.trades.length ? (
            data.trades.map((tx, i) => (
              <div
                key={tx.hash ?? i}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      tx.side === "buy"
                        ? "text-emerald-300"
                        : tx.side === "sell"
                          ? "text-rose-300"
                          : "text-white/50"
                    }
                  >
                    {tx.side.toUpperCase()}
                  </span>
                  <span className="text-white/45">{truncateHash(tx.trader, 6, 4)}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white/80">{formatUsd(tx.amountUsd)}</p>
                  <p className="text-white/35">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/45">No recent swap txs detected.</p>
          ))}

        {tab === "snipers" &&
          (data?.snipers.length ? (
            data.snipers.map((s, i) => (
              <div
                key={s.address + i}
                className="flex items-center justify-between rounded-xl border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs"
              >
                <span className="text-rose-200">{s.label}</span>
                <span className="font-mono text-white/60">{truncateHash(s.address, 8, 6)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/45">
              {data?.summary.sniperCount
                ? `${data.summary.sniperCount} sniper wallets flagged by Birdeye security scan`
                : "No sniper wallets detected — lower front-run risk"}
            </p>
          ))}

        {tab === "whales" &&
          (data?.whales.length ? (
            data.whales.map((w, i) => (
              <div
                key={w.address + i}
                className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-medium text-cyan-100">{w.label}</p>
                  <p className="font-mono text-white/45">{truncateHash(w.address, 8, 6)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCompact(w.balance)}</p>
                  <p className="text-white/45">{w.pct.toFixed(2)}% supply</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/45">Whale holder data unavailable without Birdeye API key.</p>
          ))}
      </CardContent>
    </Card>
  );
}
