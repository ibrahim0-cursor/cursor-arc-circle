"use client";

import type { ReactNode } from "react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { nexusActionGlass } from "@/lib/nexus-action-glass";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { cn, formatPct, formatUsd } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import type { NexusDecision } from "@/lib/storage";

export function NexusCenterTokenHeader({
  token,
  decision,
  actions,
  onOpenAutopilot,
}: {
  token: TrendingMarketToken;
  decision?: NexusDecision | null;
  actions?: ReactNode;
  /** Opens trade column on Autopilot tab */
  onOpenAutopilot?: () => void;
}) {
  const action = decision?.action ?? token.agent?.action;
  const up = token.change24h >= 0;

  return (
    <div className="nexus-center-header arc-glass-card arc-glass-card-nexus arc-border-trace flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <NexusTokenAvatar symbol={token.symbol} icon={token.icon} size="md" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">{token.symbol}</h2>
            {token.name && token.name !== token.symbol && (
              <span className="truncate text-xs text-white/50">{token.name}</span>
            )}
          </div>
          <p className="font-mono text-base font-semibold text-white sm:text-lg">{formatUsd(token.priceUsd)}</p>
          <p className={cn("text-xs font-semibold", up ? "text-emerald-300" : "text-rose-300")}>
            {formatPct(token.change24h)} · 24h
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {action && (
          <span
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
              action === "BUY" && "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
              action === "SELL" && "border-rose-400/40 bg-rose-500/15 text-rose-200",
              action === "HOLD" && "border-amber-400/40 bg-amber-500/15 text-amber-100",
            )}
          >
            {action}
          </span>
        )}
        {onOpenAutopilot && (
          <button
            type="button"
            onClick={onOpenAutopilot}
            className={nexusActionGlass(
              "autopilot",
              true,
              "relative z-[1] inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3 text-xs font-bold",
            )}
            title="Open Autopilot agent"
          >
            <ArcIcon3d icon={NEXUS_TRADE_ICONS.autopilot} theme="home" size="sm" className="!h-8 !w-8" />
            <span>Autopilot</span>
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}
