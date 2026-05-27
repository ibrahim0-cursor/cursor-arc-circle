"use client";

import { useEffect, useState } from "react";
import type { TokenDossierPayload } from "@/lib/nexus-research-dossier";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export function useTokenDossier(token: TrendingMarketToken | null, tier: "feed" | "alpha" = "feed") {
  const [payload, setPayload] = useState<TokenDossierPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token?.chainId || !token?.tokenAddress) {
      setPayload(null);
      return;
    }
    const snap = {
      chainId: token.chainId,
      address: token.tokenAddress,
      symbol: token.symbol,
      name: token.name ?? token.symbol,
      pair: token.pairAddress ?? "",
      price: String(token.priceUsd),
      change24h: String(token.change24h),
      volume: String(token.volume24h),
      liquidity: String(token.liquidityUsd ?? 0),
      buys: String(token.txns24h?.buys ?? 0),
      sells: String(token.txns24h?.sells ?? 0),
    };
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(snap);
        params.set("tier", tier);
        const res = await fetch(`/api/nexus/token/dossier?${params}`);
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) setError(json.error ?? "Dossier unavailable");
          else setPayload(json);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dossier");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [
    token?.chainId,
    token?.tokenAddress,
    token?.symbol,
    token?.name,
    token?.pairAddress,
    token?.priceUsd,
    token?.change24h,
    token?.volume24h,
    token?.liquidityUsd,
    token?.txns24h?.buys,
    token?.txns24h?.sells,
    tier,
  ]);

  return { payload, loading, error };
}
