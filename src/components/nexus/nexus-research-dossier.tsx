"use client";

import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ExternalLink,
  Link2,
  Loader2,
  Newspaper,
  Shield,
  Wallet,
} from "lucide-react";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { NexusHolderTables } from "@/components/nexus/nexus-holder-table";
import { NexusLiveReasoningPanel } from "@/components/nexus/nexus-live-reasoning";
import { truncateHash } from "@/lib/utils";
import type { TokenDossierPayload, TokenResearchDossier } from "@/lib/nexus-research-dossier";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

function SignalBadge({ signal }: { signal: "bullish" | "bearish" | "neutral" }) {
  const styles = {
    bullish: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
    bearish: "border-rose-400/35 bg-rose-500/15 text-rose-100",
    neutral: "border-white/15 bg-white/5 text-white/70",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${styles[signal]}`}>
      {signal}
    </span>
  );
}

function RiskVerdict({ verdict }: { verdict: "low" | "medium" | "high" | "critical" }) {
  const map = {
    low: "text-emerald-200 border-emerald-400/30",
    medium: "text-amber-100 border-amber-400/30",
    high: "text-orange-100 border-orange-400/30",
    critical: "text-rose-100 border-rose-400/30",
  };
  return (
    <span className={`rounded-lg border px-2 py-1 text-xs font-bold uppercase ${map[verdict]}`}>
      {verdict} risk
    </span>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-xs leading-relaxed text-white/80">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400/80" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function NexusResearchDossierLive({
  token,
  payload,
  loading,
  error,
}: {
  token: TrendingMarketToken;
  payload: TokenDossierPayload | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="nexus-research-dossier-live space-y-3">
      <NexusLiveReasoningPanel live={payload?.liveReasoning} token={token} loading={loading} />
      {error && !loading && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      )}
      <NexusHolderTables
        topHolders={payload?.topHolders ?? []}
        topTraders={payload?.topTraders ?? []}
        loading={loading}
        symbol={token.symbol}
      />
      {!payload?.dossier && loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning holders, TA, and news…
        </div>
      )}
      {payload?.dossier?.dataNotes?.length ? (
        <p className="text-[10px] text-white/40">{payload.dossier.dataNotes.join(" · ")}</p>
      ) : null}
    </div>
  );
}

export function NexusResearchDossierDeep({
  dossier,
  loading,
}: {
  dossier: TokenResearchDossier | undefined;
  loading: boolean;
}) {
  if (!dossier) {
    if (loading) return null;
    return null;
  }

  return (
    <div className="nexus-research-dossier-deep space-y-3">
      <NexusCollapsible
        label="Fundamentals & narrative"
        hint={`${dossier.fundamentals.length} bullets · why it's on the tape`}
        variant="reasoning"
        icon={BookOpen}
        defaultOpen={false}
        showCollapseHint
      >
        <BulletList items={dossier.fundamentals} />
      </NexusCollapsible>

      <NexusCollapsible
        label="Team & links"
        hint={dossier.teamLinks.map((l) => l.label).join(" · ")}
        variant="default"
        icon={Link2}
        defaultOpen={false}
        showCollapseHint
      >
        <div className="flex flex-wrap gap-2">
          {dossier.teamLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="arc-glass-interactive inline-flex items-center gap-1.5 rounded-xl border border-white/12 px-3 py-2 text-xs font-semibold text-cyan-100"
            >
              {link.label}
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          ))}
        </div>
      </NexusCollapsible>

      <NexusCollapsible
        label="Creator & rug check"
        hint={dossier.creatorRisk.scamLabel ?? `${dossier.creatorRisk.verdict} · Bubblemaps`}
        variant="intel"
        icon={Shield}
        defaultOpen={false}
        showCollapseHint
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <RiskVerdict verdict={dossier.creatorRisk.verdict} />
            {dossier.creatorRisk.scamLabel && (
              <span className="text-xs font-semibold text-rose-200">{dossier.creatorRisk.scamLabel}</span>
            )}
          </div>
          {dossier.creatorRisk.creatorAddress && (
            <p className="text-xs text-white/75">
              Creator / deployer:{" "}
              <span className="font-mono text-white">
                {truncateHash(dossier.creatorRisk.creatorAddress, 8, 6)}
              </span>
            </p>
          )}
          <a
            href={dossier.creatorRisk.bubblemapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200 hover:text-violet-100"
          >
            Open Bubblemaps holder graph
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {dossier.creatorRisk.rugFlags.length > 0 ? (
            <ul className="space-y-1 text-xs text-amber-100/90">
              {dossier.creatorRisk.rugFlags.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/55">No major rug heuristics — still size small on thin pools.</p>
          )}
        </div>
      </NexusCollapsible>

      <NexusCollapsible
        label="Copy-trade wallets"
        hint={`${dossier.copyTradeWallets.length} wallets to watch`}
        variant="intel"
        icon={Wallet}
        defaultOpen={false}
        showCollapseHint
      >
        <ul className="space-y-2">
          {dossier.copyTradeWallets.map((w) => (
            <li
              key={w.address}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs"
            >
              <span className="font-mono text-white/90">{truncateHash(w.address, 8, 6)}</span>
              <span className="truncate text-white/55">{w.note}</span>
            </li>
          ))}
        </ul>
      </NexusCollapsible>

      <NexusCollapsible
        label="Technical analysis (full)"
        hint={`${dossier.pattern.label} · 15m & 1h · MACD · RSI · MAs`}
        variant="technical"
        icon={BarChart3}
        defaultOpen
        showCollapseHint
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.06] px-3 py-2">
            <p className="text-xs font-bold text-violet-100">{dossier.pattern.label}</p>
            <p className="mt-0.5 text-xs text-white/65">{dossier.pattern.detail}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {dossier.technical.map((tf) => (
              <div
                key={tf.timeframe}
                className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  {tf.timeframe} · {tf.source === "birdeye_ohlcv" ? "Birdeye" : "Dex est."}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span>
                    RSI {tf.rsi14} <SignalBadge signal={tf.rsiSignal} />
                  </span>
                  <span>
                    MACD <SignalBadge signal={tf.macdSignal} />
                  </span>
                </div>
                {(tf.ma20 != null || tf.ma50 != null) && (
                  <p className="mt-2 text-[10px] text-white/55 tabular-nums">
                    MA20 {tf.ma20?.toFixed(tf.ma20 < 1 ? 6 : 2) ?? "—"} · MA50{" "}
                    {tf.ma50?.toFixed(tf.ma50 < 1 ? 6 : 2) ?? "—"} · MA200{" "}
                    {tf.ma200?.toFixed(tf.ma200 < 1 ? 6 : 2) ?? "—"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </NexusCollapsible>

      <NexusCollapsible
        label="Socials & news"
        hint="6551 OpenNews / Twitter · community sweep"
        variant="default"
        icon={Newspaper}
        defaultOpen={false}
        showCollapseHint
      >
        <BulletList items={dossier.socialNews} />
      </NexusCollapsible>
    </div>
  );
}

/** @deprecated use NexusResearchDossierLive + Deep with useTokenDossier */
export function NexusResearchDossierPanel({ token }: { token: TrendingMarketToken }) {
  return <NexusResearchDossierLive token={token} payload={null} loading={false} error={null} />;
}
