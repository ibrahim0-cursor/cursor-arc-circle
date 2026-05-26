"use client";

import { useEffect, useState } from "react";
import { Crosshair, Fish, Loader2, Radar, Target, UserX, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCompact, formatUsd, truncateHash } from "@/lib/utils";
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

  if (!chainId || !tokenAddress) {
    return (
      <Card className="border-white/10">
        <CardContent className="py-8 text-center text-sm text-white/50">
          Select a token for full intel — holders, whales, snipers, insiders, live txs
        </CardContent>
      </Card>
    );
  }

  const tabs = [
    { id: "txs" as const, label: "Txs", icon: Target },
    { id: "snipers" as const, label: "Snipers", icon: Crosshair },
    { id: "whales" as const, label: "Whales", icon: Fish },
    { id: "insiders" as const, label: "Insiders", icon: UserX },
    { id: "holders" as const, label: "Holders", icon: Users },
  ];

  return (
    <Card className="border-violet-400/20 bg-gradient-to-b from-violet-400/[0.05] to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-violet-300" />
            <div>
              <h2 className="text-lg font-medium">Token Intel</h2>
              <p className="text-xs text-white/45">
                {symbol} ·{" "}
                {data?.summary.birdeyeLive
                  ? "Birdeye live data"
                  : data?.summary.birdeyeConnected
                    ? "Birdeye connected · loading or rate-limited"
                    : "DexScreener flow estimates"}
              </p>
            </div>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <Badge variant="nexus">{data?.summary.holderCount?.toLocaleString() ?? "—"} holders</Badge>
          <Badge variant="nexus">{data?.summary.sniperCount ?? 0} snipers</Badge>
          <Badge variant="default" className="border border-violet-400/30 bg-violet-400/10">
            {data?.summary.whaleCount ?? 0} whales
          </Badge>
          <Badge variant="default" className="border border-amber-400/30 bg-amber-400/10 text-amber-200">
            {data?.summary.insiderCount ?? 0} insiders
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] ${
                tab === id ? "bg-violet-400/15 text-violet-100" : "text-white/50 hover:text-white/70"
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="max-h-72 space-y-2 overflow-y-auto">
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
                    <p className="font-medium">{formatUsd(tx.amountUsd)}</p>
                    <p className="text-white/35">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                  </>
                }
              />
            ))
          ) : (
            <Empty text="Scanning live swap flow…" />
          ))}

        {tab === "snipers" &&
          (data?.snipers.length ? (
            data.snipers.map((s, i) => (
              <Row
                key={s.address + i}
                left={<span className="text-rose-200">{s.label}</span>}
                right={<span className="font-mono">{truncateHash(s.address, 8, 6)}</span>}
                score={data.walletScores.find((w) => w.address.toLowerCase() === s.address.toLowerCase())}
              />
            ))
          ) : (
            <Empty text="No snipers detected — lower front-run risk" />
          ))}

        {tab === "whales" &&
          (data?.whales.length ? (
            data.whales.map((w, i) => (
              <Row
                key={w.address + i}
                left={
                  <div>
                    <p className="font-medium text-cyan-100">{w.label}</p>
                    <p className="font-mono text-white/45">{truncateHash(w.address, 8, 6)}</p>
                  </div>
                }
                right={
                  <>
                    <p>{formatCompact(w.balance)}</p>
                    <p className="text-white/45">{w.pct.toFixed(2)}%</p>
                  </>
                }
                score={data.walletScores.find((wsc) => wsc.address.toLowerCase() === w.address.toLowerCase())}
              />
            ))
          ) : (
            <Empty text="Loading whale data…" />
          ))}

        {tab === "insiders" &&
          (data?.insiders.length ? (
            data.insiders.map((ins, i) => (
              <Row
                key={ins.address + i}
                left={
                  <div>
                    <p className={ins.risk === "high" ? "text-rose-200" : "text-amber-200"}>{ins.label}</p>
                    <p className="font-mono text-white/45">{truncateHash(ins.address, 8, 6)}</p>
                  </div>
                }
                right={<p>{ins.pct.toFixed(1)}% · {ins.risk} risk</p>}
              />
            ))
          ) : (
            <Empty text="No insider wallets flagged" />
          ))}

        {tab === "holders" &&
          (data?.holders.length ? (
            data.holders.map((h, i) => (
              <Row
                key={h.address + i}
                left={
                  <span>
                    #{h.rank ?? i + 1} · {truncateHash(h.address, 8, 6)}
                  </span>
                }
                right={
                  <>
                    <p>{formatCompact(h.balance)}</p>
                    <p className="text-white/45">{h.pct.toFixed(2)}%</p>
                  </>
                }
                score={data.walletScores.find((w) => w.address.toLowerCase() === h.address.toLowerCase())}
              />
            ))
          ) : (
            <Empty text="Holder breakdown loading…" />
          ))}
      </CardContent>
    </Card>
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
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-xs">
      <div className="min-w-0 flex-1">{left}</div>
      <div className="flex shrink-0 items-center gap-2 text-right">
        <div>{right}</div>
        {score && <WalletScoreChip score={score} />}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-white/45">{text}</p>;
}
