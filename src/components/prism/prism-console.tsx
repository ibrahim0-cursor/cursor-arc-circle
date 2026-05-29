"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Radar, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArcBackground } from "@/components/layout/arc-background";
import { cn, truncateHash } from "@/lib/utils";
import type { PrismMacroSnapshot } from "@/lib/prism-macro-snapshot";
import { filterIntelForEvent, mergeIntelSources } from "@/lib/prism-intel-filter";
import { MACRO_EVENTS } from "@/lib/gdelt";
import type { PrismPrediction } from "@/lib/storage";
import type { CommunityPulse } from "@/lib/community-pulse";
import { CommunityPulsePanel } from "@/components/shared/community-pulse-panel";
import { useToast } from "@/components/ui/toast-provider";
import { PrismPremiumHero } from "@/components/prism/prism-premium-hero";
import { PrismCollapsible } from "@/components/prism/prism-collapsible";
import {
  HistoryRow,
  IntelRow,
  MacroChip,
  MiniStat,
  PrismSectionHead,
} from "@/components/prism/prism-parts";

type EventOption = {
  id: string;
  label: string;
  category: "macro" | "geopolitical" | "markets";
};

const INTEL_PREVIEW = 3;

function eventScopeKey(eventId: string, customEvent: string) {
  return `${eventId}::${customEvent.trim().toLowerCase()}`;
}

export function PrismConsole() {
  const toast = useToast();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selected, setSelected] = useState<string>("fed-cut-june");
  const [customEvent, setCustomEvent] = useState("");
  const [predictions, setPredictions] = useState<PrismPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [enterId, setEnterId] = useState<string | null>(null);
  const [macroSnap, setMacroSnap] = useState<PrismMacroSnapshot | null>(null);
  const [intelScope, setIntelScope] = useState<string | null>(null);
  const [intelExpanded, setIntelExpanded] = useState(false);
  const [latestIntel, setLatestIntel] = useState<{
    gdelt: Array<{ title: string; source: string }>;
    news: Array<{ title: string; source: string }>;
    eventRegistry?: Array<{ title: string; source: string }>;
    community?: CommunityPulse;
    macro?: PrismMacroSnapshot;
  } | null>(null);

  const selectedLabel =
    customEvent.trim() ||
    events.find((e) => e.id === selected)?.label ||
    MACRO_EVENTS.find((e) => e.id === selected)?.label ||
    "Event";

  const selectedQuery =
    MACRO_EVENTS.find((e) => e.id === selected)?.query ?? selectedLabel;

  const scopedIntel = useMemo(() => {
    if (!latestIntel || intelScope !== eventScopeKey(selected, customEvent)) return [];
    return filterIntelForEvent(
      mergeIntelSources(latestIntel),
      selectedLabel,
      selectedQuery,
      0.25,
    );
  }, [latestIntel, intelScope, selected, customEvent, selectedLabel, selectedQuery]);

  const loadMacro = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/prism/macro?eventId=${encodeURIComponent(eventId)}`, {
        cache: "no-store",
      });
      if (res.ok) setMacroSnap(await res.json());
    } catch {
      setMacroSnap(null);
    }
  }, []);

  const load = useCallback(async () => {
    const [predRes, eventsRes] = await Promise.all([
      fetch("/api/prism/predictions"),
      fetch("/api/prism/events"),
    ]);
    setPredictions(await predRes.json());
    setEvents(await eventsRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadMacro(selected);
  }, [selected, loadMacro]);

  useEffect(() => {
    setLatestIntel(null);
    setIntelScope(null);
    setIntelExpanded(false);
  }, [selected, customEvent]);

  async function analyze() {
    setLoading(true);
    try {
      const res = await fetch("/api/prism/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selected, customEvent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Forecast failed");
      setLatestIntel(data.intelligence);
      setIntelScope(eventScopeKey(selected, customEvent));
      setIntelExpanded(false);
      setPredictions((prev) => [data.prediction, ...prev]);
      setEnterId(data.prediction.id);
      toast({
        type: "success",
        title: "Forecast generated",
        message: `${data.prediction.probability}% · ${data.prediction.confidence}% confidence`,
      });
      requestAnimationFrame(() => {
        document.getElementById("prism-forecast")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      toast({
        type: "error",
        title: "Forecast failed",
        message: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setLoading(false);
    }
  }

  const latest = predictions[0];
  const intelVisible = scopedIntel.length > 0;
  const intelPreview = scopedIntel.slice(0, INTEL_PREVIEW);
  const intelMore = scopedIntel.slice(INTEL_PREVIEW);

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden text-white" data-prism-page data-arc-theme="prism">
      <ArcBackground theme="prism" />
      <div className="relative z-10 mx-auto max-w-7xl px-3 py-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 sm:pb-12">
        <PrismPremiumHero loading={loading} onAnalyze={analyze} />

        {macroSnap?.market && (
          <div className="prism-macro-strip mb-4 sm:mb-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MacroChip label="BTC" price={macroSnap.market.btcPrice} change={macroSnap.market.btcChange24h} />
              <MacroChip label="ETH" price={macroSnap.market.ethPrice} change={macroSnap.market.ethChange24h} />
              {macroSnap.market.totalMarketCapUsd > 0 && (
                <MacroChip
                  label="Mkt cap"
                  price={macroSnap.market.totalMarketCapUsd}
                  change={macroSnap.market.marketCapChange24h}
                  compact
                />
              )}
              {macroSnap.defi && (
                <MacroChip
                  label="DeFi TVL"
                  price={macroSnap.defi.totalTvlUsd}
                  change={macroSnap.defi.change7dPct ?? 0}
                  compact
                />
              )}
            </div>
            {macroSnap.fred && (
              <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-500/8 px-3 py-2 text-center text-[11px] text-amber-100/90">
                FRED · {macroSnap.fred.label}: {macroSnap.fred.latest.value}
                {macroSnap.fred.changePct != null
                  ? ` (${macroSnap.fred.changePct >= 0 ? "+" : ""}${macroSnap.fred.changePct.toFixed(2)}%)`
                  : ""}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6 lg:items-start">
          {/* Left: choose event + history */}
          <div className="flex min-w-0 flex-col gap-4">
            <Card className="arc-glass-card-prism prism-section-card overflow-hidden">
              <CardHeader className="shrink-0 border-b border-white/10 pb-2">
                <PrismSectionHead icon={Target} title="Choose event" />
              </CardHeader>
              <CardContent className="prism-scroll-panel max-h-[42vh] space-y-2 overflow-y-auto overflow-x-hidden lg:max-h-[38vh]">
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelected(event.id)}
                    className={cn(
                      "arc-glass-interactive w-full min-h-[52px] rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99]",
                      selected === event.id
                        ? "border-amber-400/45 bg-amber-500/15 shadow-[0_0_20px_-8px_rgba(251,146,60,0.35)]"
                        : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium leading-snug text-white">{event.label}</span>
                      <Badge variant="prism" className="shrink-0 !text-[9px]">
                        {event.category}
                      </Badge>
                    </div>
                  </button>
                ))}
                <textarea
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  placeholder="Or type your own event…"
                  className="arc-input-glass min-h-[72px] w-full resize-none px-3 py-2.5 text-sm text-white placeholder:text-white/35"
                />
              </CardContent>
            </Card>

            <PrismCollapsible
              label="History"
              hint={`${predictions.length} forecast${predictions.length === 1 ? "" : "s"}`}
              icon={History}
              defaultOpen
              bodyClassName="prism-scroll-panel max-h-[40vh] overflow-y-auto overflow-x-hidden"
            >
              {predictions.length === 0 ? (
                <p className="text-sm text-white/55">No forecasts yet — generate one above.</p>
              ) : (
                <div className="space-y-2.5">
                  {predictions.map((prediction) => (
                    <HistoryRow
                      key={prediction.id}
                      prediction={prediction}
                      animateIn={prediction.id === enterId}
                    />
                  ))}
                </div>
              )}
            </PrismCollapsible>
          </div>

          {/* Right: forecast + intel (replaces old history column) */}
          <div id="prism-forecast" className="flex min-w-0 scroll-mt-28 flex-col gap-4">
            <Card className="arc-glass-card-prism prism-forecast-card overflow-hidden">
              <CardContent className="overflow-hidden p-0">
                <div className="overflow-hidden bg-gradient-to-br from-amber-500/18 via-violet-600/10 to-transparent p-5 sm:p-7">
                  <p className="text-xs font-medium uppercase tracking-widest text-amber-200/80">Probability</p>
                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-5xl font-bold leading-none tabular-nums sm:text-6xl">
                      {latest?.probability ?? "—"}
                    </p>
                    {latest && <p className="pb-2 text-lg text-white/50">%</p>}
                  </div>
                  <p className="mt-3 break-words text-sm leading-relaxed text-white/85 sm:text-base">
                    {latest?.event ?? "Select an event, then tap Generate Forecast."}
                  </p>
                  {latest && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniStat label="Confidence" value={`${latest.confidence}%`} />
                      <MiniStat label="Kelly" value={`${(latest.kellyFraction * 100).toFixed(1)}%`} />
                      <MiniStat label="Horizon" value={latest.horizon} />
                    </div>
                  )}
                </div>
                {latest && (
                  <div className="space-y-3 overflow-hidden border-t border-white/10 p-4 sm:p-6">
                    <p className="nexus-lead break-words text-sm leading-relaxed sm:text-base">{latest.summary}</p>
                    <p className="break-words text-sm leading-relaxed text-white/70">{latest.reasoning}</p>
                    {latest.arcTxHash && (
                      <p className="text-xs text-white/45">Arc · {truncateHash(latest.arcTxHash, 10, 8)}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <PrismCollapsible
              label="Intel feed"
              hint={
                intelVisible
                  ? `${scopedIntel.length} headlines for “${selectedLabel.slice(0, 42)}${selectedLabel.length > 42 ? "…" : ""}”`
                  : "Run Generate Forecast for event-matched news"
              }
              icon={Radar}
              defaultOpen={intelVisible}
              bodyClassName="overflow-hidden"
            >
              {!intelVisible ? (
                <p className="py-3 text-center text-sm leading-relaxed text-white/55">
                  Headlines appear here after <strong className="text-amber-200">Generate Forecast</strong>, filtered
                  to your selected event only.
                </p>
              ) : (
                <div className="space-y-2 overflow-hidden">
                  {intelPreview.map((item, index) => (
                    <IntelRow
                      key={`${item.source}-${index}`}
                      source={item.source}
                      title={item.title}
                      relevancePct={item.relevancePct}
                    />
                  ))}
                  {intelMore.length > 0 && (
                    <>
                      {intelExpanded &&
                        intelMore.map((item, index) => (
                          <IntelRow
                            key={`more-${item.source}-${index}`}
                            source={item.source}
                            title={item.title}
                            relevancePct={item.relevancePct}
                          />
                        ))}
                      <button
                        type="button"
                        onClick={() => setIntelExpanded((v) => !v)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 py-2 text-[11px] font-semibold uppercase tracking-wider text-amber-100/90 transition hover:bg-amber-500/18"
                      >
                        {intelExpanded ? "Show fewer" : `Show ${intelMore.length} more`}
                      </button>
                    </>
                  )}
                  {latestIntel?.community && latestIntel.community.items.length > 0 && (
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <CommunityPulsePanel pulse={latestIntel.community} title="Community pulse" compact />
                    </div>
                  )}
                </div>
              )}
            </PrismCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
