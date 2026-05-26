"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, LineChart, Loader2 } from "lucide-react";
import { dexChartEmbedUrl } from "@/lib/dexscreener";

export function NexusTokenChart({
  chainId,
  pairAddress,
  tokenAddress,
  symbol,
}: {
  chainId?: string;
  pairAddress?: string;
  tokenAddress?: string;
  symbol?: string;
}) {
  const [resolvedPair, setResolvedPair] = useState(pairAddress ?? "");
  const [dexUrl, setDexUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    setResolvedPair(pairAddress ?? "");
  }, [pairAddress]);

  useEffect(() => {
    if (!chainId || !tokenAddress || resolvedPair) return;
    let cancelled = false;
    setResolving(true);
    fetch(`/api/nexus/pair?chainId=${encodeURIComponent(chainId)}&address=${encodeURIComponent(tokenAddress)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.pairAddress) setResolvedPair(data.pairAddress);
        if (data.url) setDexUrl(data.url);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chainId, tokenAddress, resolvedPair]);

  if (!chainId || (!resolvedPair && !tokenAddress)) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-cyan-400/25 bg-gradient-to-br from-cyan-500/5 to-transparent p-6 text-center sm:h-[240px]"
      >
        <div>
          <LineChart className="mx-auto mb-2 h-8 w-8 text-cyan-300/40" />
          <p className="text-sm text-white/55">Select a token from the feed to load chart</p>
        </div>
      </motion.div>
    );
  }

  if (!resolvedPair) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-cyan-400/20 bg-black/25 p-6 sm:h-[240px]">
        {resolving ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
            <p className="text-sm text-white/60">Resolving DexScreener pair for {symbol ?? "token"}…</p>
          </>
        ) : (
          <>
            <LineChart className="h-8 w-8 text-cyan-300/50" />
            <p className="text-center text-sm text-white/60">No chart pair found for this token.</p>
            {dexUrl && (
              <a
                href={dexUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-cyan-200 underline"
              >
                Open on DexScreener <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <motion.div
      key={`${chainId}:${resolvedPair}`}
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
        src={dexChartEmbedUrl(chainId, resolvedPair)}
        className="h-[min(52dvh,360px)] w-full border-0 sm:h-[300px] lg:h-[320px]"
        allow="clipboard-write"
      />
    </motion.div>
  );
}
