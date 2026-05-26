"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ExternalLink, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { formatPct, formatUsd, truncateHash } from "@/lib/utils";
import { arcExplorerTx } from "@/lib/arc";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import type { DemoPosition, DemoTradeRecord } from "@/lib/storage";
import type { MarkedPosition } from "@/lib/demo-trading";

const REFRESH_MS = 30_000;

export function NexusPortfolio({
  refreshKey,
  livePrices,
}: {
  refreshKey?: number;
  /** Optional live prices from feed for instant mark updates */
  livePrices?: Record<string, number>;
}) {
  const { address } = useAccount();
  const [positions, setPositions] = useState<MarkedPosition[]>([]);
  const [trades, setTrades] = useState<DemoTradeRecord[]>([]);
  const [summary, setSummary] = useState<{
    totalValueUsd: number;
    unrealizedPnlUsd: number;
    realizedPnlUsd: number;
    totalPnlUsd: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/nexus/demo/portfolio?wallet=${address}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        let pos = (data.positions ?? []) as MarkedPosition[];
        if (livePrices && Object.keys(livePrices).length > 0) {
          pos = pos.map((p) => {
            const key = p.tokenAddress.toLowerCase();
            const live = livePrices[key];
            if (!live || live <= 0) return p;
            const currentValueUsd = p.tokenAmount * live;
            const unrealizedPnlUsd = currentValueUsd - p.usdcSpent;
            return {
              ...p,
              markPriceUsd: live,
              currentValueUsd,
              unrealizedPnlUsd,
              unrealizedPnlPct: p.usdcSpent > 0 ? (unrealizedPnlUsd / p.usdcSpent) * 100 : 0,
            };
          });
          const totalValueUsd = pos.reduce((s, p) => s + p.currentValueUsd, 0);
          const totalSpentUsd = pos.reduce((s, p) => s + p.usdcSpent, 0);
          setSummary({
            totalValueUsd,
            unrealizedPnlUsd: totalValueUsd - totalSpentUsd,
            realizedPnlUsd: data.summary?.realizedPnlUsd ?? 0,
            totalPnlUsd: totalValueUsd - totalSpentUsd + (data.summary?.realizedPnlUsd ?? 0),
          });
        } else {
          setSummary(data.summary ?? null);
        }
        setPositions(pos);
        setTrades(data.trades ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [address, livePrices]);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load, refreshKey]);

  if (!address) return null;

  const hint = summary
    ? `${formatUsd(summary.totalValueUsd)} · P&L ${formatUsd(summary.totalPnlUsd)}`
    : "No positions";

  return (
    <NexusCollapsible label="Portfolio" hint={hint}>
      <div className="space-y-2">
        {loading && positions.length === 0 ? (
          <div className="flex items-center gap-2 py-2 text-xs text-white/45">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : positions.length === 0 ? (
          <p className="text-[11px] text-white/45">Buy a token to track live P&L vs DexScreener prices.</p>
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <Stat label="Value" value={formatUsd(summary.totalValueUsd)} />
                <Stat
                  label="Unrealized"
                  value={formatUsd(summary.unrealizedPnlUsd)}
                  positive={summary.unrealizedPnlUsd >= 0}
                />
                <Stat
                  label="Realized"
                  value={formatUsd(summary.realizedPnlUsd)}
                  positive={summary.realizedPnlUsd >= 0}
                />
              </div>
            )}
            {positions.map((pos) => (
              <PositionRow key={pos.id} pos={pos} />
            ))}
          </>
        )}

        {trades.length > 0 && (
          <div className="border-t border-white/8 pt-2">
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">Recent</p>
            {trades.slice(0, 8).map((t) => {
              const isBuy = t.side === "buy";
              return (
              <div
                key={t.id}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-[10px] ${
                  isBuy
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-400/25 bg-rose-500/10 text-rose-100"
                }`}
              >
                <span className="font-semibold capitalize">
                  {isBuy ? "BUY" : "SELL"} {t.symbol}
                  {t.usdcAmount != null && isBuy && ` · ${formatUsd(t.usdcAmount)}`}
                  {t.pnlUsd != null && (
                    <span className={t.pnlUsd >= 0 ? " text-emerald-200" : " text-rose-200"}>
                      {" "}
                      P&L {formatUsd(t.pnlUsd)}
                    </span>
                  )}
                </span>
                {t.arcFeeTxHash && (
                  <a
                    href={arcExplorerTx(t.arcFeeTxHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-emerald-300 hover:underline"
                  >
                    Scan <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </NexusCollapsible>
  );
}

function PositionRow({ pos }: { pos: MarkedPosition }) {
  const up = pos.unrealizedPnlUsd >= 0;
  return (
    <div className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{pos.symbol}</p>
          <p className="text-[10px] text-white/40">
            {pos.tokenAmount.toFixed(4)} @ {formatUsd(pos.avgEntryUsd)} → {formatUsd(pos.markPriceUsd)}
          </p>
        </div>
        <div className="text-right">
          <p className={`flex items-center justify-end gap-0.5 text-sm font-medium ${up ? "text-emerald-300" : "text-rose-300"}`}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatUsd(pos.unrealizedPnlUsd)}
          </p>
          <p className={`text-[10px] ${up ? "text-emerald-300/80" : "text-rose-300/80"}`}>
            {formatPct(pos.unrealizedPnlPct)}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/6 bg-white/[0.02] px-2 py-1.5">
      <p className="text-[9px] uppercase text-white/35">{label}</p>
      <p
        className={`text-xs font-medium ${
          positive === undefined ? "text-white/80" : positive ? "text-emerald-300" : "text-rose-300"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
