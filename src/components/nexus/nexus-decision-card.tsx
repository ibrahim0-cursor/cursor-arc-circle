"use client";

import { motion } from "framer-motion";
import {
  Crosshair,
  ExternalLink,
  Copy,
  Check,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCompact, formatPct, formatUsd, truncateHash } from "@/lib/utils";
import type { NexusDecision } from "@/lib/storage";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";

export function NexusDecisionCard({
  decision,
  selected,
  onSelect,
}: {
  decision: NexusDecision;
  selected: boolean;
  onSelect: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    await navigator.clipboard.writeText(decision.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full rounded-2xl border p-5 text-left transition ${
        selected
          ? "border-cyan-400/50 bg-cyan-400/[0.08] shadow-[0_0_40px_rgba(34,211,238,0.12)]"
          : "border-white/10 bg-black/20 hover:border-white/20"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {decision.icon ? (
            <img src={decision.icon} alt="" className="h-11 w-11 rounded-xl border border-white/10" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-bold text-cyan-200">
              {decision.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">{decision.symbol}</span>
              <Badge
                variant={
                  decision.action === "BUY" ? "buy" : decision.action === "SELL" ? "sell" : "hold"
                }
              >
                {decision.action}
              </Badge>
              {decision.swappable !== false && (
                <Badge variant="nexus" className="normal-case tracking-normal">
                  Demo trade
                </Badge>
              )}
            </div>
            <p className="text-xs text-white/45">{decision.name ?? decision.chainId}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium">{formatUsd(decision.priceUsd)}</p>
          <p className={decision.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}>
            {formatPct(decision.change24h)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            copyAddress();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/10"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
          {truncateHash(decision.token, 8, 6)}
        </button>
        <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200">
          0x {decision.chainId}
        </span>
        {decision.dexUrl && (
          <a
            href={decision.dexUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-cyan-200/80 hover:bg-white/5"
          >
            DexScreener <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="MCap" value={decision.intel?.marketCap ? formatCompact(decision.intel.marketCap) : "—"} />
        <Metric label="Liquidity" value={formatCompact(decision.liquidityUsd ?? 0)} />
        <Metric
          label="Snipers"
          value={decision.intel?.sniperCount != null ? String(decision.intel.sniperCount) : "—"}
          warn={(decision.intel?.sniperCount ?? 0) > 5}
        />
        <Metric
          label="Holders"
          value={decision.intel?.holderCount != null ? decision.intel.holderCount.toLocaleString() : "—"}
        />
      </div>

      <div className="mt-3 text-[11px] text-white/40">
        Confidence {decision.confidence}% · Risk {decision.riskScore}/100
      </div>
    </motion.button>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${warn ? "border-amber-400/30 bg-amber-400/5" : "border-white/8 bg-white/[0.02]"}`}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/90">{value}</p>
    </div>
  );
}

function ImpactIcon({ impact }: { impact: "bullish" | "bearish" | "neutral" }) {
  if (impact === "bullish") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (impact === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-rose-400" />;
  return <Minus className="h-3.5 w-3.5 text-white/40" />;
}

export function NexusTokenDetail({ decision }: { decision: NexusDecision | null }) {
  if (!decision) {
    return (
      <div className="flex min-h-[80px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/45">
        <Crosshair className="mb-2 h-6 w-6 text-cyan-300/50" />
        Select a token for verdict and intel
      </div>
    );
  }

  const factors = decision.reasoningFactors ?? [];
  const bullish = factors.filter((f) => f.impact === "bullish").length;
  const bearish = factors.filter((f) => f.impact === "bearish").length;
  const summaryHint = `${decision.action} · ${decision.confidence}% conf · risk ${decision.riskScore} · ${bullish}↑ ${bearish}↓`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Badge
            variant={decision.action === "BUY" ? "buy" : decision.action === "SELL" ? "sell" : "hold"}
          >
            {decision.action}
          </Badge>
          <span className="text-sm font-medium">
            {decision.symbol} · {formatUsd(decision.priceUsd)}
          </span>
        </div>
        <span className="text-[11px] text-white/45">
          {decision.confidence}% · risk {decision.riskScore}
        </span>
      </div>

      <NexusCollapsible label="Agent reasoning" hint={summaryHint}>
        <p className="text-sm leading-6 text-white/75">{decision.whyAction ?? decision.reasoning}</p>
        {factors.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {factors.map((f) => (
              <div key={f.label} className="flex items-start justify-between gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5 text-[11px]">
                <div className="flex min-w-0 items-start gap-1.5">
                  <ImpactIcon impact={f.impact} />
                  <span className="text-white/75">
                    <span className="font-medium">{f.label}</span> · {f.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </NexusCollapsible>
    </div>
  );
}
