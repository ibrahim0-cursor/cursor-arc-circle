"use client";

import { motion } from "framer-motion";
import { LineChart } from "lucide-react";
import { dexChartEmbedUrl } from "@/lib/dexscreener";

export function NexusTokenChart({
  chainId,
  pairAddress,
  symbol,
}: {
  chainId?: string;
  pairAddress?: string;
  symbol?: string;
}) {
  if (!chainId || !pairAddress) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-cyan-400/25 bg-gradient-to-br from-cyan-500/5 to-transparent p-6 text-center sm:h-[240px]"
      >
        <div>
          <LineChart className="mx-auto mb-2 h-8 w-8 text-cyan-300/40" />
          <p className="text-sm text-white/55">Select a token — chart loads from DexScreener</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`${chainId}:${pairAddress}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0a0f18] shadow-[0_0_40px_rgba(34,211,238,0.06)]"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 sm:px-4 sm:py-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
          <LineChart className="h-4 w-4" />
          {symbol ?? "Chart"}
        </p>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          Live
        </span>
      </div>
      <iframe
        title={`${symbol ?? "Token"} chart`}
        src={dexChartEmbedUrl(chainId, pairAddress)}
        className="h-[220px] w-full border-0 sm:h-[300px] lg:h-[320px]"
        allow="clipboard-write"
      />
    </motion.div>
  );
}
