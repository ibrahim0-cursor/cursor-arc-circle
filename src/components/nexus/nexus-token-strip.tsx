"use client";

import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { formatUsd } from "@/lib/utils";

export function NexusTokenStrip({
  tokens,
  selected,
  onSelect,
  mobileLimit = 40,
}: {
  tokens: TrendingMarketToken[];
  selected: TrendingMarketToken | null;
  onSelect: (t: TrendingMarketToken) => void;
  mobileLimit?: number;
}) {
  if (tokens.length === 0) return null;

  const list = tokens.slice(0, mobileLimit);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-2.5 max-lg:sticky max-lg:top-[7.5rem] max-lg:z-20 max-lg:bg-[#050508]/95 max-lg:backdrop-blur-md">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
        Switch token · {list.length}
        {tokens.length > list.length ? ` of ${tokens.length}` : ""} live
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((t) => {
          const active =
            selected?.tokenAddress.toLowerCase() === t.tokenAddress.toLowerCase() &&
            selected.chainId === t.chainId;
          return (
            <button
              key={`${t.chainId}:${t.tokenAddress}`}
              type="button"
              onClick={() => onSelect(t)}
              className={`flex min-w-[88px] shrink-0 snap-start flex-col rounded-xl border px-3 py-2.5 text-left transition active:scale-95 ${
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
