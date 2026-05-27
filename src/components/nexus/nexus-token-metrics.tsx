"use client";

import { motion } from "framer-motion";
import { Activity, BarChart3, Droplets, Layers, TrendingDown, TrendingUp } from "lucide-react";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { formatCompact, formatPct } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export function NexusTokenMetrics({
  token,
  compact = false,
}: {
  token: TrendingMarketToken | null;
  /** Denser grid for center column toolbar */
  compact?: boolean;
}) {
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
      className={
        compact
          ? "nexus-metrics-compact grid grid-cols-4 gap-1.5"
          : "grid grid-cols-2 gap-2 sm:grid-cols-4"
      }
    >
      {items.map((m) => (
        <div
          key={m.label}
          className={
            compact
              ? "arc-glass-card arc-glass-card-nexus flex flex-col gap-0.5 px-2 py-2 text-center"
              : "arc-glass-card arc-glass-card-nexus arc-glass-interactive flex items-start gap-2.5 px-3 py-2.5"
          }
        >
          {!compact && <ArcIconBadge icon={m.icon} theme="nexus" size="sm" />}
          <div className={compact ? "min-w-0" : "min-w-0"}>
            <p className={compact ? "text-[9px] font-semibold uppercase tracking-wide text-white/45" : "arc-caption !text-[10px]"}>
              {m.label}
            </p>
            <p
              className={`font-mono font-bold ${compact ? "text-xs" : "text-sm"} ${m.tone ?? "text-white"}`}
            >
              {m.value}
            </p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
