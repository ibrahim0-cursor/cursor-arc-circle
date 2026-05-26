"use client";

import { motion } from "framer-motion";
import { Activity, BarChart3, Droplets, Layers, TrendingDown, TrendingUp } from "lucide-react";
import { formatCompact, formatPct } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export function NexusTokenMetrics({ token }: { token: TrendingMarketToken | null }) {
  if (!token) return null;

  const mcap = token.intel?.marketCap;
  const fdv = token.intel?.fdv;
  const turnover =
    token.liquidityUsd > 0 ? (token.volume24h / token.liquidityUsd).toFixed(2) : "—";
  const buys = token.intel?.buy24h ?? token.txns24h?.buys ?? 0;
  const sells = token.intel?.sell24h ?? token.txns24h?.sells ?? 0;

  const items = [
    { icon: BarChart3, label: "MCap", value: mcap ? formatCompact(mcap) : "—" },
    { icon: Layers, label: "FDV", value: fdv ? formatCompact(fdv) : "—" },
    { icon: Droplets, label: "Liquidity", value: formatCompact(token.liquidityUsd) },
    { icon: Activity, label: "Vol 24h", value: formatCompact(token.volume24h) },
    { icon: TrendingUp, label: "Turnover", value: turnover === "—" ? "—" : `${turnover}×` },
    {
      icon: token.change24h >= 0 ? TrendingUp : TrendingDown,
      label: "24h",
      value: formatPct(token.change24h),
      tone: token.change24h >= 0 ? "text-emerald-300" : "text-rose-300",
    },
    { icon: TrendingUp, label: "Buys", value: formatCompact(buys), tone: "text-emerald-300/90" },
    { icon: TrendingDown, label: "Sells", value: formatCompact(sells), tone: "text-rose-300/90" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {items.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 transition hover:border-cyan-400/20"
        >
          <m.icon className="mb-1 h-3.5 w-3.5 text-cyan-300/70" />
          <p className="text-[10px] uppercase tracking-wider text-white/45">{m.label}</p>
          <p className={`text-sm font-bold ${m.tone ?? "text-white"}`}>{m.value}</p>
        </div>
      ))}
    </motion.div>
  );
}
