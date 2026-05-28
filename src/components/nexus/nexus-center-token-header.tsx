"use client";

import type { ReactNode } from "react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { nexusActionGlass } from "@/lib/nexus-action-glass";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { cn, formatCompact, formatPct, formatTokenPrice } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import type { NexusDecision } from "@/lib/storage";

function AgentVerdictPill({ action }: { action: "BUY" | "SELL" | "HOLD" }) {
  return (
    <span
      className={cn(
        "nexus-verdict-pill shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        action === "BUY" && "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
        action === "SELL" && "border-rose-400/40 bg-rose-500/20 text-rose-100",
        action === "HOLD" && "border-amber-400/40 bg-amber-500/20 text-amber-100",
      )}
    >
      {action}
    </span>
  );
}

export function NexusCenterTokenHeader({
  token,
  decision,
  actions,
  onOpenAutopilot,
}: {
  token: TrendingMarketToken;
  decision?: NexusDecision | null;
  actions?: ReactNode;
  onOpenAutopilot?: () => void;
}) {
  const action = decision?.action ?? token.agent?.action;
  const up = token.change24h >= 0;
  const mcap = token.marketCap ?? token.intel?.marketCap;
  const liq = token.liquidityUsd;
  const vol = token.volume24h;

  return (
    <div className="nexus-center-header arc-glass-card arc-glass-card-nexus arc-border-trace px-3 py-3 sm:px-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <NexusTokenAvatar symbol={token.symbol} icon={token.icon} size="md" />
          <div className="nexus-center-quote min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-white sm:text-xl">{token.symbol}</h2>
                {token.name && token.name !== token.symbol && (
                  <p className="truncate text-xs text-white/50">{token.name}</p>
                )}
              </div>
              {action && <AgentVerdictPill action={action} />}
            </div>

            <p className="nexus-live-price mt-2 text-2xl font-semibold text-white sm:text-[1.65rem]">
              {formatTokenPrice(token.priceUsd)}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className={cn("font-semibold tabular-nums", up ? "text-emerald-300" : "text-rose-300")}>
                {formatPct(token.change24h)}
                <span className="font-normal text-white/40"> · 24h</span>
              </span>
              {mcap != null && mcap > 0 && (
                <span className="tabular-nums text-white/50">
                  MCap <span className="text-white/80">{formatCompact(mcap)}</span>
                </span>
              )}
              {liq > 0 && (
                <span className="tabular-nums text-white/50">
                  Liq <span className="text-white/80">{formatCompact(liq)}</span>
                </span>
              )}
              {vol > 0 && (
                <span className="tabular-nums text-white/50">
                  Vol <span className="text-white/80">{formatCompact(vol)}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="nexus-center-actions flex flex-wrap items-center gap-2 lg:max-w-[280px] lg:justify-end">
          {onOpenAutopilot && (
            <button
              type="button"
              onClick={onOpenAutopilot}
              className={nexusActionGlass(
                "autopilot",
                true,
                "inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold sm:flex-none",
              )}
              title="Open Autopilot agent"
            >
              <ArcIcon3d icon={NEXUS_TRADE_ICONS.autopilot} theme="home" size="sm" className="!h-7 !w-7" />
              <span>Autopilot</span>
            </button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
