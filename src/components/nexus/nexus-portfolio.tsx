"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Briefcase, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatUsd, truncateHash } from "@/lib/utils";
import { arcExplorerTx } from "@/lib/arc";
import { DEMO_TRADE_NETWORKS } from "@/lib/testnet-chains";
import type { DemoPosition, DemoTradeRecord } from "@/lib/storage";

export function NexusPortfolio({ refreshKey }: { refreshKey?: number }) {
  const { address } = useAccount();
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [trades, setTrades] = useState<DemoTradeRecord[]>([]);
  const [summary, setSummary] = useState<{
    totalValueUsd: number;
    unrealizedPnlUsd: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/nexus/demo/portfolio?wallet=${address}`);
      const data = await res.json();
      if (res.ok) {
        setPositions(data.positions ?? []);
        setTrades(data.trades ?? []);
        setSummary(data.summary ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!address) {
    return (
      <Card className="border-white/10">
        <CardContent className="py-8 text-center text-sm text-white/50">
          Connect wallet to view demo portfolio
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-medium">Demo Portfolio</h2>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
        </div>
        {summary && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/55">
            <span>Value {formatUsd(summary.totalValueUsd)}</span>
            <span className={summary.unrealizedPnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}>
              P&L {formatUsd(summary.unrealizedPnlUsd)}
            </span>
            <Badge variant="nexus">Settles to Arc USDC</Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {positions.length === 0 ? (
          <p className="text-sm text-white/45">No open demo positions. Buy a trending token to start.</p>
        ) : (
          positions.map((pos) => {
            const network = DEMO_TRADE_NETWORKS.find((n) => n.id === pos.tradeNetwork);
            const value = pos.tokenAmount * pos.priceUsd;
            const pnl = value - pos.usdcSpent;
            return (
              <div key={pos.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{pos.symbol}</p>
                    <p className="text-xs text-white/45">{network?.label ?? pos.tradeNetwork}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{pos.tokenAmount.toFixed(4)} tokens</p>
                    <p className={pnl >= 0 ? "text-emerald-300" : "text-rose-300"}>{formatUsd(pnl)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {trades.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Recent trades</p>
            <div className="max-h-36 space-y-2 overflow-y-auto">
              {trades.slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-xs text-white/55">
                  <span className="capitalize">
                    {t.side.replace("_", " ")} {t.symbol} · {formatUsd(t.usdcAmount)}
                  </span>
                  {t.arcFeeTxHash && (
                    <a
                      href={arcExplorerTx(t.arcFeeTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-emerald-300 hover:underline"
                    >
                      Arc Scan
                      <ExternalLink className="h-3 w-3" />
                      {truncateHash(t.arcFeeTxHash, 4, 4)}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
