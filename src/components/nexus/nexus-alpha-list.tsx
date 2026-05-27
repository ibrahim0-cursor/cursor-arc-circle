"use client";

import { Code2, Loader2, Newspaper, ScanLine, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";
import {
  ALPHA_SCAN_EMPTY,
  ALPHA_SCAN_ERROR_TIP,
  ALPHA_SCAN_LOADING,
  agentVerdictLine,
  publicSourceLabel,
} from "@/lib/nexus-copy";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { NexusTokenChatButton } from "@/components/nexus/nexus-token-chat";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { formatCompact, formatPct, formatUsd } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AlphaOpportunity } from "@/lib/nexus-agent";
import type { AlphaScanIntel } from "@/lib/alpha-scan-engine";

function alphaToChatToken(row: AlphaOpportunity): TrendingMarketToken {
  return {
    symbol: row.symbol,
    name: row.name,
    tokenAddress: row.tokenAddress,
    chainId: row.chainId,
    pairAddress: "",
    priceUsd: row.priceUsd,
    change24h: row.change24h,
    volume24h: row.volume24h,
    liquidityUsd: row.liquidityUsd,
    icon: row.icon,
    url: "",
    agent: {
      action: row.action,
      confidence: row.confidence,
      riskScore: row.riskScore,
      reasoning: row.aiThesis || row.reasoning,
      whyAction: row.whyAction,
      reasoningFactors: [],
    },
  };
}

export function NexusAlphaList({
  opportunities,
  scanIntel,
  selectedAddress,
  onSelect,
  scanning = false,
  scanError,
}: {
  opportunities: AlphaOpportunity[];
  scanIntel?: AlphaScanIntel | null;
  selectedAddress?: string | null;
  onSelect: (row: AlphaOpportunity) => void;
  scanning?: boolean;
  scanError?: string | null;
}) {
  if (scanning) {
    return (
      <div className="arc-glass-card arc-glass-card-nexus space-y-4 p-8 text-center">
        <ArcIconBadge icon={ScanLine} theme="nexus" size="lg" className="mx-auto" />
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-300" />
        <h3 className="text-base font-semibold text-white">Alpha scan running…</h3>
        <p className="mx-auto max-w-md text-sm text-white/60">{ALPHA_SCAN_LOADING}</p>
        <div className="mx-auto flex max-w-xs flex-col gap-2 pt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (scanError && opportunities.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-400/35 bg-rose-500/10 p-6 text-sm text-rose-100">
        <p className="font-semibold text-rose-50">Could not complete Alpha scan</p>
        <p className="leading-relaxed text-rose-100/90">{scanError}</p>
        <p className="text-xs text-rose-200/70">{ALPHA_SCAN_ERROR_TIP}</p>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="arc-panel arc-panel-nexus space-y-3 p-8 text-center">
        <div className="arc-panel-stripe arc-panel-stripe-nexus -mx-8 -mt-8 mb-4 w-[calc(100%+4rem)]" />
        <ArcIconBadge icon={Sparkles} theme="nexus" size="lg" className="mx-auto" />
        <h3 className="text-base font-semibold text-white">Alpha Scan</h3>
        <p className="mx-auto max-w-md text-sm text-white/60">{ALPHA_SCAN_EMPTY}</p>
      </div>
    );
  }

  const sentimentLine =
    scanIntel?.marketSentiment.publicSummary ??
    scanIntel?.marketSentiment.summary;

  return (
    <div className="space-y-3">
      {scanError && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
          Last run: {scanError}
        </div>
      )}
      {scanIntel && (
        <div className="arc-glass-card arc-glass-card-nexus space-y-2 px-3 py-2.5 text-xs">
          <p className="font-semibold text-emerald-100">
            Market mood: {scanIntel.marketSentiment.label} ({scanIntel.marketSentiment.score})
          </p>
          <p className="text-white/60 leading-relaxed">{sentimentLine}</p>
        </div>
      )}
      <div className="arc-glass-card arc-glass-card-nexus px-3 py-2.5 text-xs text-emerald-100/90">
        <p className="font-semibold">{opportunities.length} ranked opportunities</p>
        <p className="mt-1 text-white/55">
          Agent verdicts only — tap a row for chart, chat, and full thesis (no manual tables).
        </p>
      </div>
      <div className="space-y-2">
        {opportunities.map((row) => {
          const selected = selectedAddress?.toLowerCase() === row.tokenAddress.toLowerCase();
          return (
            <button
              key={`${row.chainId}:${row.tokenAddress}`}
              type="button"
              onClick={() => onSelect(row)}
              className={cn(
                "arc-glass-card arc-glass-interactive group w-full px-3 py-3 text-left transition-all duration-200 lg:px-3 lg:py-2.5",
                "hover:shadow-[0_0_24px_-8px_rgba(18,232,168,0.35)]",
                selected
                  ? "arc-glass-card-nexus ring-1 ring-emerald-400/35"
                  : "hover:border-emerald-400/25",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-2.5">
                  <NexusTokenAvatar symbol={row.symbol} icon={row.icon} size="sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">
                        #{row.rank}
                      </span>
                      <span className="text-sm font-semibold text-white">{row.symbol}</span>
                      <span
                        className="pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        <NexusTokenChatButton
                          token={alphaToChatToken(row)}
                          className="!min-h-[28px] !px-2 !py-0.5 !text-[9px]"
                        />
                      </span>
                      <Badge
                        variant={
                          row.action === "BUY" ? "buy" : row.action === "SELL" ? "sell" : "hold"
                        }
                      >
                        {row.action}
                      </Badge>
                      <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold text-fuchsia-200">
                        Alpha {row.alphaScore}
                      </span>
                      <span className="text-[10px] text-emerald-200/80">
                        Narr +{row.narrativeAcceleration}
                      </span>
                      {row.sourceTags?.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200/90"
                        >
                          {publicSourceLabel(tag)}
                        </span>
                      ))}
                    </div>
                    {row.ecosystemTags.length > 0 && (
                      <p className="mt-0.5 text-[10px] text-cyan-200/70 line-clamp-1">
                        {row.ecosystemTags.join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-white/55 line-clamp-2 lg:line-clamp-1">
                      {row.researchGlance ?? row.narrativeSummary}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className="font-medium">{formatUsd(row.priceUsd)}</p>
                  <p
                    className={cn(
                      "flex items-center justify-end gap-0.5",
                      row.change24h >= 0 ? "text-emerald-300" : "text-rose-300",
                    )}
                  >
                    {row.change24h >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatPct(row.change24h)}
                  </p>
                  <p className="text-[10px] text-rose-200/70">Risk {row.riskScore}</p>
                </div>
              </div>

              <p className="mt-2 text-[10px] text-white/40">
                Tap for chart · trade · full intel
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
                <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-rose-200/80">
                  Rug {row.riskBreakdown.rug}
                </span>
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-200/80">
                  Liq {row.riskBreakdown.liquidity}
                </span>
                <span className="rounded-md bg-orange-500/15 px-1.5 py-0.5 text-orange-200/80">
                  Conc {row.riskBreakdown.concentration}
                </span>
                <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 text-purple-200/80">
                  Hype {row.riskBreakdown.hypeExhaustion}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/45">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-cyan-300/70" />
                  Vol {formatCompact(row.volume24h)}
                </span>
                <span>Liq {formatCompact(row.liquidityUsd)}</span>
                <span>{row.confidence}% conf</span>
              </div>
              {row.newsHeadlines.length > 0 && (
                <p className="mt-1.5 flex items-start gap-1 text-[10px] text-cyan-200/70 line-clamp-1">
                  <Newspaper className="mt-0.5 h-3 w-3 shrink-0" />
                  {row.newsHeadlines[0]}
                </p>
              )}
              {row.githubDevSummary && (
                <p className="mt-1 flex items-start gap-1 text-[10px] text-slate-200/75 line-clamp-1">
                  <Code2 className="mt-0.5 h-3 w-3 shrink-0" />
                  Dev: {row.githubDevSummary}
                </p>
              )}
              {row.socialBuzz && (
                <p className="mt-1 flex items-start gap-1 text-[10px] text-fuchsia-200/75 line-clamp-1">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                  {row.socialBuzz}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
