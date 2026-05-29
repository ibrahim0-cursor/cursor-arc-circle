"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { truncateHash } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

const CHAINS = [
  { id: "base", label: "Base" },
  { id: "ethereum", label: "ETH" },
  { id: "arbitrum", label: "ARB" },
  { id: "bsc", label: "BSC" },
  { id: "polygon", label: "POL" },
] as const;

export type TokenPick = {
  symbol: string;
  name: string;
  tokenAddress: string;
  chainId: string;
  pairAddress?: string;
  priceUsd?: number;
  icon?: string;
};

export function NexusTokenSearchPicker({
  chainId,
  onChainChange,
  address,
  onResolved,
  catalog = [],
  label = "Search token by name or contract (CA)",
}: {
  chainId: string;
  onChainChange: (chain: string) => void;
  address: string;
  onResolved: (pick: TokenPick) => void;
  catalog?: TrendingMarketToken[];
  label?: string;
}) {
  const [query, setQuery] = useState(address);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remote, setRemote] = useState<TokenPick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(address);
  }, [address]);

  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.filter((t) => t.chainId === chainId).slice(0, 8);
    return catalog
      .filter((t) => {
        if (t.chainId !== chainId) return false;
        return (
          t.symbol.toLowerCase().includes(q) ||
          (t.name ?? "").toLowerCase().includes(q) ||
          t.tokenAddress.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [catalog, query, chainId]);

  const results = useMemo(() => {
    const seen = new Set<string>();
    const merged: TokenPick[] = [];
    for (const t of [...localMatches, ...remote]) {
      const key = `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({
        symbol: t.symbol,
        name: t.name ?? t.symbol,
        tokenAddress: t.tokenAddress,
        chainId: t.chainId,
        pairAddress: "pairAddress" in t ? t.pairAddress : undefined,
        priceUsd: t.priceUsd,
        icon: t.icon,
      });
      if (merged.length >= 10) break;
    }
    return merged;
  }, [localMatches, remote]);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setRemote([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/nexus/token/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: trimmed,
            chainId,
            catalog: catalog.slice(0, 40).map((t) => ({
              symbol: t.symbol,
              name: t.name,
              tokenAddress: t.tokenAddress,
              chainId: t.chainId,
              pairAddress: t.pairAddress,
              priceUsd: t.priceUsd,
              icon: t.icon,
            })),
          }),
          signal: AbortSignal.timeout(10_000),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Search failed");
        setRemote(json.results ?? []);
        if ((json.results ?? []).length === 0 && trimmed.startsWith("0x")) {
          setError("No pair on this chain — try Base or paste full CA");
        }
      } catch (e) {
        setRemote([]);
        setError(e instanceof Error ? e.message : "Search unavailable");
      } finally {
        setLoading(false);
      }
    },
    [chainId, catalog],
  );

  const onQueryChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(value), 320);
  };

  const pick = (t: TokenPick) => {
    onResolved(t);
    setQuery(`${t.symbol} · ${t.name}`);
    setOpen(false);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-white/80">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {CHAINS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChainChange(c.id)}
            className={`min-h-[36px] rounded-lg border px-2.5 text-[11px] font-bold uppercase tracking-wide ${
              chainId === c.id
                ? "border-cyan-400/45 bg-cyan-500/15 text-cyan-100"
                : "border-white/10 bg-black/30 text-white/50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="VIRTUAL, PEPE, or 0x… contract"
          className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 py-2 pl-9 pr-10 text-sm text-white placeholder:text-white/35"
          autoComplete="off"
          spellCheck={false}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-300/80" />
        )}
      </div>
      {error && <p className="text-[11px] text-amber-200/90">{error}</p>}
      {open && results.length > 0 && (
        <ul className="max-h-[200px] overflow-y-auto rounded-xl border border-white/12 bg-[#0a0e14] shadow-lg">
          {results.map((t) => (
            <li key={`${t.chainId}:${t.tokenAddress}`}>
              <button
                type="button"
                onClick={() => pick(t)}
                className="flex w-full items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 text-left hover:bg-cyan-500/10"
              >
                {t.icon ? (
                  <img src={t.icon} alt="" className="h-7 w-7 rounded-full" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">
                    {t.symbol.slice(0, 2)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white">
                    {t.symbol}
                    <span className="ml-1.5 font-normal text-white/50">{t.name}</span>
                  </span>
                  <span className="font-mono text-[10px] text-white/45">
                    {truncateHash(t.tokenAddress, 8, 6)} · {t.chainId}
                  </span>
                </span>
                {t.priceUsd != null && t.priceUsd > 0 && (
                  <span className="shrink-0 text-xs tabular-nums text-cyan-200/90">
                    ${t.priceUsd < 1 ? t.priceUsd.toFixed(4) : t.priceUsd.toFixed(2)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {address && !open && (
        <p className="font-mono text-[10px] text-emerald-200/80">
          Selected · {truncateHash(address, 10, 8)}
        </p>
      )}
    </div>
  );
}
