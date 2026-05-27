"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, LineChart, Loader2 } from "lucide-react";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { ArcPanel } from "@/components/ui/arc-panel";
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
        className="arc-signal-panel arc-signal-panel-nexus flex h-[200px] items-center justify-center p-6 text-center sm:h-[240px]"
      >
        <div>
          <ArcIconBadge icon={LineChart} theme="nexus" size="md" className="mx-auto mb-3" />
          <p className="text-sm text-white/55">Select a token from the feed to load chart</p>
        </div>
      </motion.div>
    );
  }

  if (!resolvedPair) {
    return (
      <div className="arc-signal-panel arc-signal-panel-nexus flex h-[200px] flex-col items-center justify-center gap-3 p-6 sm:h-[240px]">
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
    <motion.div key={`${chainId}:${resolvedPair}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <ArcPanel
        theme="nexus"
        title={symbol ?? "Live chart"}
        icon={LineChart}
        action={
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            Live
          </span>
        }
        className="overflow-hidden [&_.arc-panel-body]:!p-0"
      >
        <iframe
          title={`${symbol ?? "Token"} chart`}
          src={dexChartEmbedUrl(chainId, resolvedPair)}
          className="h-[min(52dvh,360px)] w-full border-0 sm:h-[300px] lg:h-[320px]"
          allow="clipboard-write"
        />
      </ArcPanel>
    </motion.div>
  );
}
