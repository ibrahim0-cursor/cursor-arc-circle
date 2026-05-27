"use client";

import { Newspaper, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCompact, formatPct, formatUsd } from "@/lib/utils";
import type { AlphaOpportunity } from "@/lib/nexus-agent";

export function NexusAlphaList({
  opportunities,
  selectedAddress,
  onSelect,
}: {
  opportunities: AlphaOpportunity[];
  selectedAddress?: string | null;
  onSelect: (row: AlphaOpportunity) => void;
}) {
  if (opportunities.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-violet-400/25 bg-violet-500/5 p-8 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-violet-300/70" />
        <h3 className="text-base font-semibold text-white">Alpha Scan — opportunity radar</h3>
        <p className="mx-auto max-w-sm text-sm text-white/60">
          Runs news + meme headlines, Birdeye on-chain intel, TA, macro regime, and AI scoring on up
          to 30 tokens. Best setups ranked by opportunity score — not just the live feed signal.
        </p>
        <p className="text-xs text-white/45">Connect wallet → Alpha Scan → results appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2.5 text-xs text-violet-100/90">
        <p className="font-semibold">{opportunities.length} ranked opportunities</p>
        <p className="mt-1 text-white/55">
          News, meme buzz, whales, TA, and scam checks combined. Tap a row to open chart &amp; trade.
        </p>
      </div>
      <div className="space-y-1.5">
        {opportunities.map((row) => {
          const selected =
            selectedAddress?.toLowerCase() === row.tokenAddress.toLowerCase();
          return (
            <button
              key={`${row.chainId}:${row.tokenAddress}`}
              type="button"
              onClick={() => onSelect(row)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-violet-400/45 bg-violet-400/10 ring-1 ring-violet-400/25"
                  : "border-white/10 bg-black/25 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      #{row.rank} {row.symbol}
                    </span>
                    <Badge
                      variant={
                        row.action === "BUY"
                          ? "buy"
                          : row.action === "SELL"
                            ? "sell"
                            : "hold"
                      }
                    >
                      {row.action}
                    </Badge>
                    <span className="text-[10px] font-bold text-violet-200">
                      Opp {row.opportunityScore}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/50 line-clamp-2">{row.whyAction}</p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p>{formatUsd(row.priceUsd)}</p>
                  <p
                    className={
                      row.change24h >= 0 ? "text-emerald-300" : "text-rose-300"
                    }
                  >
                    {formatPct(row.change24h)}
                  </p>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-white/45">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Vol {formatCompact(row.volume24h)}
                </span>
                <span>Liq {formatCompact(row.liquidityUsd)}</span>
                <span>{row.confidence}% conf</span>
              </div>
              {row.newsHeadlines.length > 0 && (
                <p className="mt-1 flex items-start gap-1 text-[10px] text-cyan-200/70 line-clamp-1">
                  <Newspaper className="mt-0.5 h-3 w-3 shrink-0" />
                  {row.newsHeadlines[0]}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
