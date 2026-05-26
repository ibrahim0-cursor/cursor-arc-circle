"use client";

import { useEffect, useState } from "react";
import { Crosshair, Fish, Loader2, Target, UserX, Users } from "lucide-react";
import { formatCompact, formatUsd, truncateHash } from "@/lib/utils";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { WalletScoreChip } from "@/components/nexus/nexus-wallet-score";
import type { TokenTx, TokenWhale, TokenInsider } from "@/lib/storage";
import type { WalletScore } from "@/lib/wallet-score";

type Detection = {
  trades: TokenTx[];
  whales: TokenWhale[];
  snipers: Array<{ address: string; label: string }>;
  insiders: TokenInsider[];
  holders: Array<TokenWhale & { rank?: number }>;
  walletScores: WalletScore[];
  summary: {
    sniperCount?: number;
    whaleCount?: number;
    insiderCount?: number;
    top10Pct?: number;
    holderCount?: number;
    birdeyeConnected?: boolean;
    birdeyeLive?: boolean;
    dataSource?: "birdeye" | "birdeye_pending" | "unavailable";
  };
};

export function NexusTokenDetectPanel({
  chainId,
  tokenAddress,
  symbol,
  txns24h,
  volume24h,
}: {
  chainId?: string;
  tokenAddress?: string;
  symbol?: string;
  txns24h?: { buys: number; sells: number };
  volume24h?: number;
}) {
  const [tab, setTab] = useState<"txs" | "snipers" | "whales" | "insiders" | "holders">("txs");
  const [data, setData] = useState<Detection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chainId || !tokenAddress) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          chainId: chainId!,
          address: tokenAddress!,
          buys: String(txns24h?.buys ?? 0),
          sells: String(txns24h?.sells ?? 0),
          volume: String(volume24h ?? 0),
        });
        const res = await fetch(`/api/nexus/token/detect?${params}&t=${Date.now()}`);
        const json = await res.json();
        if (!cancelled && res.ok) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chainId, tokenAddress, txns24h?.buys, txns24h?.sells, volume24h]);

  if (!chainId || !tokenAddress) return null;

  const s = data?.summary;
  const sourceLabel =
    s?.birdeyeLive
      ? "Birdeye live"
      : s?.birdeyeConnected
        ? "Birdeye · no data yet"
        : "Add BIRDEYE_API_KEY";

  const hint = [
    s?.holderCount != null ? `${formatCompact(s.holderCount)} holders` : null,
    s?.sniperCount != null ? `${s.sniperCount} snipers` : null,
    s?.whaleCount != null ? `${s.whaleCount} whales` : null,
    sourceLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  const tabs = [
    { id: "txs" as const, label: "Txs", icon: Target },
    { id: "snipers" as const, label: "Snipers", icon: Crosshair },
    { id: "whales" as const, label: "Whales", icon: Fish },
    { id: "insiders" as const, label: "Insiders", icon: UserX },
    { id: "holders" as const, label: "Holders", icon: Users },
  ];

  return (
    <NexusCollapsible label={`Token intel · ${symbol ?? "token"}`} hint={hint || "Loading…"}>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <span>{sourceLabel}</span>
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>

        <div className="flex flex-wrap gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] ${
                tab === id ? "bg-violet-400/15 text-violet-100" : "text-white/50"
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-40 space-y-1 overflow-y-auto">
          {tab === "txs" &&
            (data?.trades.length ? (
              data.trades.map((tx, i) => (
                <Row
                  key={tx.hash ?? i}
                  left={
                    <span className={tx.side === "buy" ? "text-emerald-300" : tx.side === "sell" ? "text-rose-300" : ""}>
                      {tx.side.toUpperCase()} · {truncateHash(tx.trader, 6, 4)}
                    </span>
                  }
                  right={
                    <>
                      {formatUsd(tx.amountUsd)}
                      <span className="text-white/35"> · {new Date(tx.timestamp).toLocaleTimeString()}</span>
                    </>
                  }
                />
              ))
            ) : (
              <Empty text="No live swaps from Birdeye for this token yet." />
            ))}

          {tab === "snipers" &&
            (data?.snipers.length ? (
              data.snipers.map((sn, i) => (
                <Row
                  key={sn.address + i}
                  left={sn.label}
                  right={truncateHash(sn.address, 8, 6)}
                  score={data.walletScores.find((w) => w.address.toLowerCase() === sn.address.toLowerCase())}
                />
              ))
            ) : (
              <Empty text="No sniper wallets flagged (Birdeye security)." />
            ))}

          {tab === "whales" &&
            (data?.whales.length ? (
              data.whales.map((w, i) => (
                <Row
                  key={w.address + i}
                  left={`${w.label} · ${truncateHash(w.address, 6, 4)}`}
                  right={`${formatCompact(w.balance)} · ${w.pct.toFixed(1)}%`}
                  score={data.walletScores.find((wsc) => wsc.address.toLowerCase() === w.address.toLowerCase())}
                />
              ))
            ) : (
              <Empty text="No whale holder data from Birdeye." />
            ))}

          {tab === "insiders" &&
            (data?.insiders.length ? (
              data.insiders.map((ins, i) => (
                <Row
                  key={ins.address + i}
                  left={`${ins.label} · ${truncateHash(ins.address, 6, 4)}`}
                  right={`${ins.pct.toFixed(1)}% · ${ins.risk}`}
                />
              ))
            ) : (
              <Empty text="No insider wallets flagged." />
            ))}

          {tab === "holders" &&
            (data?.holders.length ? (
              data.holders.map((h, i) => (
                <Row
                  key={h.address + i}
                  left={`#${h.rank ?? i + 1} · ${truncateHash(h.address, 8, 6)}`}
                  right={`${formatCompact(h.balance)} · ${h.pct.toFixed(1)}%`}
                  score={data.walletScores.find((w) => w.address.toLowerCase() === h.address.toLowerCase())}
                />
              ))
            ) : (
              <Empty text="No holder breakdown from Birdeye." />
            ))}
        </div>
      </div>
    </NexusCollapsible>
  );
}

function Row({
  left,
  right,
  score,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  score?: WalletScore;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/6 bg-black/20 px-2 py-1.5 text-[11px]">
      <span className="min-w-0 truncate text-white/75">{left}</span>
      <div className="flex shrink-0 items-center gap-1.5 text-white/55">
        {right}
        {score && <WalletScoreChip score={score} />}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-2 text-[11px] text-white/45">{text}</p>;
}
