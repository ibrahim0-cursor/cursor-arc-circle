"use client";

import { Code2, Loader2, Newspaper, ScanLine, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";
import { formatCompact, formatPct, formatUsd } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AlphaOpportunity } from "@/lib/nexus-agent";

function tokenAccent(symbol: string): string {
  const hues = [190, 260, 310, 160, 220, 280];
  const hash = symbol.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return hues[hash % hues.length]!.toString();
}

function TokenAvatar({
  symbol,
  icon,
  size = "md",
}: {
  symbol: string;
  icon?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const text = size === "sm" ? "text-[10px]" : "text-xs";

  if (icon) {
    return (
      <img
        src={icon}
        alt=""
        className={cn(
          "shrink-0 rounded-xl border border-white/15 object-cover shadow-[0_0_12px_-4px_rgba(103,232,249,0.35)]",
          dim,
        )}
      />
    );
  }

  const hue = tokenAccent(symbol);
  return (
    <div
      className={cn(
        "arc-token-hex flex shrink-0 items-center justify-center border border-white/10 font-bold text-white shadow-inner",
        dim,
        text,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 42% / 0.55), hsl(${(Number(hue) + 40) % 360} 65% 28% / 0.45))`,
      }}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function NexusAlphaList({
  opportunities,
  selectedAddress,
  onSelect,
  scanning = false,
  scanError,
}: {
  opportunities: AlphaOpportunity[];
  selectedAddress?: string | null;
  onSelect: (row: AlphaOpportunity) => void;
  scanning?: boolean;
  scanError?: string | null;
}) {
  if (scanning) {
    return (
      <div className="arc-signal-panel arc-border-trace space-y-4 p-8 text-center">
        <ArcIconFrame icon={ScanLine} variant="nexus" size="lg" active className="mx-auto" />
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-300" />
        <h3 className="text-base font-semibold text-white">Alpha scan running…</h3>
        <p className="mx-auto max-w-md text-sm text-white/60">
          Analyzing up to 20 tokens — Birdeye, news, narrative layers, and AI thesis. This can take
          30–90 seconds.
        </p>
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
        <p className="font-semibold text-rose-50">Alpha scan failed</p>
        <p className="leading-relaxed text-rose-100/90">{scanError}</p>
        <p className="text-xs text-rose-200/70">
          Tip: stay on Arc Testnet, approve the fee tx, and retry if external APIs were slow.
        </p>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/5 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15">
          <Sparkles className="h-7 w-7 text-violet-300" />
        </div>
        <h3 className="text-base font-semibold text-white">Alpha Scan — early opportunity detection</h3>
        <p className="mx-auto max-w-md text-sm text-white/60">
          Six intelligence layers: narrative acceleration, smart money, momentum, risk breakdown, AI
          thesis, and optional GitHub dev momentum.
        </p>
        <p className="text-xs text-white/45">Connect wallet → Alpha Scan → ranked results appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scanError && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
          Previous scan issue: {scanError}
        </div>
      )}
      <div className="arc-signal-panel arc-signal-panel-nexus px-3 py-2.5 text-xs text-emerald-100/90">
        <p className="font-semibold">{opportunities.length} probabilistic opportunities (sorted by Alpha Score)</p>
        <p className="mt-1 text-white/55">
          Narrative acceleration is weighted highest. Tap a row for chart, trade panel, and full thesis.
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
                "arc-signal-panel group w-full px-3 py-3 text-left transition-all duration-200 lg:px-3 lg:py-2.5",
                "hover:shadow-[0_0_24px_-8px_rgba(18,232,168,0.35)]",
                selected
                  ? "arc-signal-panel-nexus ring-1 ring-emerald-400/35"
                  : "hover:border-emerald-400/25",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-2.5">
                  <TokenAvatar symbol={row.symbol} icon={row.icon} size="sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">
                        #{row.rank}
                      </span>
                      <span className="text-sm font-semibold text-white">{row.symbol}</span>
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
                    </div>
                    {row.ecosystemTags.length > 0 && (
                      <p className="mt-0.5 text-[10px] text-cyan-200/70 line-clamp-1">
                        {row.ecosystemTags.join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-white/55 line-clamp-2 lg:line-clamp-1">
                      {row.narrativeSummary}
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

              <div className="mt-2 grid gap-1 text-[10px] text-white/50">
                <p>
                  <span className="text-fuchsia-200/80">Smart money:</span> {row.smartMoneySignal}
                </p>
                <p>
                  <span className="text-emerald-200/80">Momentum:</span> {row.momentumHealth}
                </p>
                <p className="line-clamp-2 text-violet-100/75">
                  <span className="text-violet-200/90">AI thesis:</span> {row.aiThesis}
                </p>
              </div>

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
              {row.socialDegraded && !row.socialBuzz && (
                <p className="mt-1 flex items-start gap-1 text-[10px] text-amber-200/80 line-clamp-1">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                  {row.socialDegraded}
                </p>
              )}
              {row.socialBuzz && (
                <p className="mt-1 flex items-start gap-1 text-[10px] text-fuchsia-200/75 line-clamp-1">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                  {row.galaxyScore != null ? `Galaxy ${row.galaxyScore} · ` : ""}
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
