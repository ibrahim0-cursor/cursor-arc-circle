"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Fish,
  Loader2,
  Radar,
  Target,
  UserX,
  Users,
} from "lucide-react";
import { formatCompact, formatUsd, truncateHash } from "@/lib/utils";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { WalletScoreChip } from "@/components/nexus/nexus-wallet-score";
import { useIntegrationsStatus } from "@/hooks/use-integrations-status";
import type { TokenTx, TokenWhale, TokenInsider } from "@/lib/storage";
import type { WalletScore } from "@/lib/wallet-score";

type Detection = {
  serverHasKey?: boolean;
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
    holderSource?: "holders" | "top_traders";
    dataSource?: "birdeye" | "birdeye_pending" | "unavailable";
  };
  errors?: string[];
};

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "error" | "loading";
  children: React.ReactNode;
}) {
  const styles = {
    ok: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    warn: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    error: "border-rose-400/40 bg-rose-500/15 text-rose-100",
    loading: "border-white/15 bg-white/5 text-white/80",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

export function NexusTokenDetectPanel({
  chainId,
  tokenAddress,
  symbol,
  txns24h,
  volume24h,
  onIntelUpdate,
}: {
  chainId?: string;
  tokenAddress?: string;
  symbol?: string;
  txns24h?: { buys: number; sells: number };
  volume24h?: number;
  onIntelUpdate?: (summary: {
    holderCount?: number;
    sniperCount?: number;
    whaleCount?: number;
    insiderCount?: number;
    top10Pct?: number;
  }) => void;
}) {
  const [tab, setTab] = useState<"txs" | "snipers" | "whales" | "insiders" | "holders">("txs");
  const [data, setData] = useState<Detection | null>(null);
  const [loading, setLoading] = useState(false);
  const { status: integrations } = useIntegrationsStatus();

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
        if (!cancelled && res.ok) {
          setData(json);
          if ((json.summary?.birdeyeLive || json.summary?.dataSource === "birdeye") && onIntelUpdate) {
            onIntelUpdate({
              holderCount: json.summary.holderCount,
              sniperCount: json.summary.sniperCount,
              whaleCount: json.summary.whaleCount,
              insiderCount: json.summary.insiderCount,
              top10Pct: json.summary.top10Pct,
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chainId, tokenAddress, txns24h?.buys, txns24h?.sells, volume24h, onIntelUpdate]);

  if (!chainId || !tokenAddress) return null;

  const s = data?.summary;
  const serverHasKey = data?.serverHasKey ?? integrations?.birdeye ?? s?.birdeyeConnected;
  const probeOk = integrations?.birdeyeProbe?.ok;
  const isLive = Boolean(s?.birdeyeLive || s?.dataSource === "birdeye");

  const sourceLabel = isLive
    ? s?.holderSource === "top_traders"
      ? "Live · top traders (EVM)"
      : "Live · Birdeye"
    : serverHasKey && probeOk === false
      ? "Key invalid or rate-limited"
      : serverHasKey
        ? "Loading Birdeye…"
        : "API key not on server";

  const hint = [
    s?.holderCount != null ? `${formatCompact(s.holderCount)} holders` : null,
    s?.sniperCount != null ? `${s.sniperCount} snipers` : null,
    s?.whaleCount != null ? `${s.whaleCount} whales` : null,
    isLive ? sourceLabel : serverHasKey ? sourceLabel : "Configure Birdeye",
  ]
    .filter(Boolean)
    .join(" · ");

  const tabs = [
    { id: "txs" as const, label: "Swaps", icon: Target },
    { id: "snipers" as const, label: "Snipers", icon: Crosshair },
    { id: "whales" as const, label: "Whales", icon: Fish },
    { id: "insiders" as const, label: "Insiders", icon: UserX },
    { id: "holders" as const, label: "Holders", icon: Users },
  ];

  const statusTone: "ok" | "warn" | "error" | "loading" = loading
    ? "loading"
    : isLive
      ? "ok"
      : serverHasKey
        ? "warn"
        : "error";

  return (
    <NexusCollapsible
      label={`Token intel · ${symbol ?? "token"}`}
      hint={hint || "Loading market intel…"}
      variant="intel"
      icon={Radar}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {statusTone === "loading" && (
            <StatusPill tone="loading">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Fetching Birdeye…
            </StatusPill>
          )}
          {statusTone === "ok" && (
            <StatusPill tone="ok">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {sourceLabel}
            </StatusPill>
          )}
          {statusTone === "warn" && (
            <StatusPill tone="warn">
              <AlertTriangle className="h-3.5 w-3.5" />
              {sourceLabel}
            </StatusPill>
          )}
          {statusTone === "error" && (
            <StatusPill tone="error">
              <AlertTriangle className="h-3.5 w-3.5" />
              Birdeye not configured
            </StatusPill>
          )}
        </div>

        {!serverHasKey && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-sm leading-relaxed text-amber-50/95">
            <p className="font-semibold">Birdeye is required for whale, sniper &amp; swap data</p>
            <p className="mt-1 text-xs text-amber-100/85">
              Add <code className="rounded bg-black/30 px-1 font-mono">BIRDEYE_API_KEY</code> in Vercel env (or{" "}
              <code className="rounded bg-black/30 px-1 font-mono">.env.local</code> locally), redeploy, then hard-refresh.
            </p>
          </div>
        )}

        {data?.errors && data.errors.length > 0 && !isLive && serverHasKey && (
          <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {data.errors[0]}
            {data.errors.length > 1 ? ` (+${data.errors.length - 1} more)` : ""}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === id
                  ? "bg-amber-400/20 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                  : "bg-white/5 text-white/65 hover:bg-white/10 hover:text-white/90"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-48 space-y-1.5 overflow-y-auto pr-0.5">
          {tab === "txs" &&
            (data?.trades.length ? (
              data.trades.map((tx, i) => (
                <Row
                  key={tx.hash ?? i}
                  left={
                    <span
                      className={
                        tx.side === "buy"
                          ? "font-semibold text-emerald-300"
                          : tx.side === "sell"
                            ? "font-semibold text-rose-300"
                            : "text-white/80"
                      }
                    >
                      {tx.side.toUpperCase()} · {truncateHash(tx.trader, 6, 4)}
                    </span>
                  }
                  right={
                    <>
                      <span className="font-medium text-white/90">{formatUsd(tx.amountUsd)}</span>
                      <span className="text-white/50"> · {new Date(tx.timestamp).toLocaleTimeString()}</span>
                    </>
                  }
                />
              ))
            ) : (
              <Empty
                text={
                  serverHasKey
                    ? "No recent swaps from Birdeye yet — try again in a minute (rate limits)."
                    : "Connect Birdeye to show live swap feed."
                }
              />
            ))}

          {tab === "snipers" &&
            (data?.snipers.length ? (
              data.snipers.map((sn, i) => (
                <Row
                  key={sn.address + i}
                  left={<span className="font-medium text-white/90">{sn.label}</span>}
                  right={truncateHash(sn.address, 8, 6)}
                  score={data.walletScores.find((w) => w.address.toLowerCase() === sn.address.toLowerCase())}
                />
              ))
            ) : (
              <Empty text="No sniper wallets flagged by Birdeye security." />
            ))}

          {tab === "whales" &&
            (data?.whales.length ? (
              data.whales.map((w, i) => (
                <Row
                  key={w.address + i}
                  left={
                    <span className="text-white/90">
                      <span className="font-medium">{w.label}</span> · {truncateHash(w.address, 6, 4)}
                    </span>
                  }
                  right={
                    <span className="text-white/85">
                      {s?.holderSource === "top_traders"
                        ? `${formatCompact(w.balance)} vol`
                        : formatCompact(w.balance)}{" "}
                      · {w.pct.toFixed(1)}%
                    </span>
                  }
                  score={data.walletScores.find((wsc) => wsc.address.toLowerCase() === w.address.toLowerCase())}
                />
              ))
            ) : (
              <Empty
                text={
                  s?.holderSource === "top_traders"
                    ? "No top traders returned for this token."
                    : "No whale holders from Birdeye."
                }
              />
            ))}

          {tab === "insiders" &&
            (data?.insiders.length ? (
              data.insiders.map((ins, i) => (
                <Row
                  key={ins.address + i}
                  left={
                    <span className="text-white/90">
                      {ins.label} · {truncateHash(ins.address, 6, 4)}
                    </span>
                  }
                  right={
                    <span className="capitalize text-white/85">
                      {ins.pct.toFixed(1)}% · <span className={ins.risk === "high" ? "text-rose-300" : ""}>{ins.risk}</span>
                    </span>
                  }
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
                  left={
                    <span className="font-medium text-white/90">
                      #{h.rank ?? i + 1} · {truncateHash(h.address, 8, 6)}
                    </span>
                  }
                  right={
                    <span className="text-white/85">
                      {formatCompact(h.balance)} · {h.pct.toFixed(1)}%
                    </span>
                  }
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
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
      <span className="min-w-0 truncate">{left}</span>
      <div className="flex shrink-0 items-center gap-1.5 text-xs">
        {right}
        {score && <WalletScoreChip score={score} />}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-white/12 px-3 py-4 text-center text-sm text-white/65">{text}</p>;
}
