"use client";

import { useEffect, useRef } from "react";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export type LiveTokenQuote = {
  chainId: string;
  tokenAddress: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCap?: number;
  fdv?: number;
  pairAddress?: string;
  url?: string;
  txns24h?: { buys: number; sells: number };
  priceChange?: TrendingMarketToken["priceChange"];
};

const REFRESH_MS = 20_000;

/** Pull latest DexScreener pair price/stats for the selected token */
export function useLiveTokenQuote(
  token: TrendingMarketToken | null,
  onQuote: (quote: LiveTokenQuote) => void,
) {
  const onQuoteRef = useRef(onQuote);
  onQuoteRef.current = onQuote;

  useEffect(() => {
    if (!token?.chainId || !token?.tokenAddress) return;
    const chainId = token.chainId;
    const tokenAddress = token.tokenAddress;

    let cancelled = false;

    async function refresh() {
      try {
        const params = new URLSearchParams({
          chainId,
          address: tokenAddress,
        });
        const res = await fetch(`/api/nexus/pair?${params}`, { cache: "no-store" });
        const data = (await res.json()) as LiveTokenQuote & { error?: string };
        if (cancelled || !res.ok || !(data.priceUsd > 0)) return;
        onQuoteRef.current({
          ...data,
          chainId,
          tokenAddress,
        });
      } catch {
        /* keep last quote */
      }
    }

    const schedule = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void refresh();
    };
    schedule();
    const timer = setInterval(schedule, REFRESH_MS);
    const onVis = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [token?.chainId, token?.tokenAddress]);
}
