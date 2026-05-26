"use client";

import { dexChartEmbedUrl } from "@/lib/dexscreener";

export function NexusTokenChart({
  chainId,
  pairAddress,
}: {
  chainId?: string;
  pairAddress?: string;
}) {
  if (!chainId || !pairAddress) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-cyan-400/20 bg-black/30 text-sm text-white/40">
        Select a token to load live chart
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0a0f18] shadow-[0_0_60px_rgba(34,211,238,0.08)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
          Live DexScreener Chart
        </p>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
          Real-time
        </span>
      </div>
      <iframe
        title="Token chart"
        src={dexChartEmbedUrl(chainId, pairAddress)}
        className="h-[420px] w-full border-0"
        allow="clipboard-write"
      />
    </div>
  );
}
