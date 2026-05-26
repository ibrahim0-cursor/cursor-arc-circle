"use client";

import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { formatUsd } from "@/lib/utils";

export function NexusTokenStrip({
  tokens,
  selected,
  onSelect,
}: {
  tokens: TrendingMarketToken[];
  selected: TrendingMarketToken | null;
  onSelect: (t: TrendingMarketToken) => void;
}) {
  if (tokens.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
        Switch token · {tokens.length} live
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tokens.map((t) => {
          const active =
            selected?.tokenAddress.toLowerCase() === t.tokenAddress.toLowerCase() &&
            selected.chainId === t.chainId;
          return (
            <button
              key={`${t.chainId}:${t.tokenAddress}`}
              type="button"
              onClick={() => onSelect(t)}
              className={`flex shrink-0 flex-col rounded-xl border px-3 py-2 text-left transition active:scale-95 ${
                active
                  ? "border-cyan-400/50 bg-cyan-500/20"
                  : "border-white/10 bg-white/[0.04] hover:border-white/20"
              }`}
            >
              <span className="text-sm font-bold text-white">{t.symbol}</span>
              <span className="text-[10px] text-white/55">{formatUsd(t.priceUsd)}</span>
              {t.agent && (
                <span
                  className={`mt-1 text-[9px] font-bold uppercase ${
                    t.agent.action === "BUY"
                      ? "text-emerald-300"
                      : t.agent.action === "SELL"
                        ? "text-rose-300"
                        : "text-amber-200"
                  }`}
                >
                  {t.agent.action}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
