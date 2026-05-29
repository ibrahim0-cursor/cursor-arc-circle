"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe2, Radar, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArcBackground } from "@/components/layout/arc-background";
import { MeridianFooter } from "@/components/layout/meridian-footer";
import { cn, truncateHash } from "@/lib/utils";
import type { PrismMacroSnapshot } from "@/lib/prism-macro-snapshot";
import type { PrismPrediction } from "@/lib/storage";
import type { CommunityPulse } from "@/lib/community-pulse";
import { CommunityPulsePanel } from "@/components/shared/community-pulse-panel";
import { useToast } from "@/components/ui/toast-provider";
import { PrismPremiumHero } from "@/components/prism/prism-premium-hero";
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

export function PrismConsole() {
  const toast = useToast();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selected, setSelected] = useState<string>("fed-cut-june");
  const [customEvent, setCustomEvent] = useState("");
  const [predictions, setPredictions] = useState<PrismPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [enterId, setEnterId] = useState<string | null>(null);
  const [macroSnap, setMacroSnap] = useState<PrismMacroSnapshot | null>(null);
  const [latestIntel, setLatestIntel] = useState<{
    gdelt: Array<{ title: string; source: string }>;
    news: Array<{ title: string; source: string }>;
    eventRegistry?: Array<{ title: string; source: string }>;
    community?: CommunityPulse;
    macro?: PrismMacroSnapshot;
  } | null>(null);

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
      setPredictions((prev) => [data.prediction, ...prev]);
      setEnterId(data.prediction.id);
      toast({
        type: "success",
        title: "Forecast generated",
        message: `${data.prediction.probability}% probability`,
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

  return (
    <div className="relative min-h-screen text-white" data-prism-page data-arc-theme="prism">
      <ArcBackground theme="prism" />
      <div className="relative mx-auto max-w-7xl px-3 py-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 sm:pb-12">
        <PrismPremiumHero loading={loading} onAnalyze={analyze} />

        {macroSnap?.market && (
          <div className="prism-macro-strip mb-4 sm:mb-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MacroChip
                label="BTC"
                price={macroSnap.market.btcPrice}
                change={macroSnap.market.btcChange24h}
              />
              <MacroChip
                label="ETH"
                price={macroSnap.market.ethPrice}
                change={macroSnap.market.ethChange24h}
              />
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
            <p className="mt-2 text-center text-[10px] text-amber-200/55">
              Binance + CoinGecko
              {macroSnap.defi ? " · DefiLlama" : ""}
              {macroSnap.fred ? " · FRED" : ""}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_1.1fr] lg:gap-6">
          <div id="prism-forecast" className="order-1 scroll-mt-28 space-y-4 sm:space-y-6 lg:order-2">
            <Card className="arc-glass-card-prism prism-forecast-card overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-amber-500/18 via-violet-600/10 to-transparent p-5 sm:p-8">
                  <p className="text-xs font-medium uppercase tracking-widest text-amber-200/80">Probability</p>
                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-5xl font-bold leading-none sm:text-7xl">{latest?.probability ?? "—"}</p>
                    {latest && <p className="pb-2 text-xl text-white/50">%</p>}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-lg">
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
                  <div className="space-y-3 p-4 sm:p-8">
                    <p className="nexus-lead text-sm sm:text-base">{latest.summary}</p>
                    <p className="text-sm leading-relaxed text-white/70">{latest.reasoning}</p>
                    {latest.arcTxHash && (
                      <p className="text-xs text-white/45">Arc · {truncateHash(latest.arcTxHash, 10, 8)}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="arc-glass-card-prism prism-section-card">
              <CardHeader className="pb-2">
                <PrismSectionHead icon={Globe2} title="History" />
              </CardHeader>
              <CardContent className="prism-scroll-panel max-h-[36vh] space-y-3 sm:max-h-[50vh]">
                {predictions.length === 0 ? (
                  <p className="text-sm text-white/55">No forecasts yet.</p>
                ) : (
                  predictions.map((prediction) => (
                    <HistoryRow
                      key={prediction.id}
                      prediction={prediction}
                      animateIn={prediction.id === enterId}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="order-2 space-y-4 lg:order-1">
            <Card className="arc-glass-card-prism prism-section-card">
              <CardHeader className="pb-2">
                <PrismSectionHead icon={Target} title="Choose event" />
              </CardHeader>
              <CardContent className="prism-scroll-panel max-h-[45vh] space-y-2 lg:max-h-none">
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelected(event.id)}
                    className={cn(
                      "arc-glass-interactive w-full min-h-[56px] rounded-xl border px-4 py-3 text-left transition active:scale-[0.99]",
                      selected === event.id
                        ? "border-amber-400/45 bg-amber-500/15 shadow-[0_0_24px_-8px_rgba(251,146,60,0.35)]"
                        : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">{event.label}</span>
                      <Badge variant="prism" className="!text-[9px]">
                        {event.category}
                      </Badge>
                    </div>
                  </button>
                ))}
                <textarea
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  placeholder="Or type your own event…"
                  className="arc-input-glass min-h-[80px] w-full px-4 py-3 text-base text-white placeholder:text-white/35"
                />
              </CardContent>
            </Card>

            <Card className="arc-glass-card-prism prism-section-card">
              <CardHeader className="pb-2">
                <PrismSectionHead icon={Radar} title="Intel feed" />
              </CardHeader>
              <CardContent className="prism-scroll-panel max-h-[35vh] space-y-2 lg:max-h-[28vh]">
                {(latestIntel?.gdelt ?? []).slice(0, 4).map((item, index) => (
                  <IntelRow key={`g-${index}`} source={item.source} title={item.title} />
                ))}
                {(latestIntel?.news ?? []).slice(0, 3).map((item, index) => (
                  <IntelRow key={`n-${index}`} source={item.source} title={item.title} />
                ))}
                {(latestIntel?.eventRegistry ?? []).slice(0, 4).map((item, index) => (
                  <IntelRow key={`er-${index}`} source={item.source} title={item.title} />
                ))}
                {latestIntel?.community && latestIntel.community.items.length > 0 && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <CommunityPulsePanel pulse={latestIntel.community} title="Crypto community" compact />
                  </div>
                )}
                {!latestIntel && (
                  <p className="py-4 text-center text-sm text-white/55">
                    Tap <strong className="text-amber-200">Generate Forecast</strong> for Binance/FRED/DeFi macro plus
                    GDELT, NewsAPI, Event Registry, and community pulse.
                  </p>
                )}
              </CardContent>
            </Card>

            {predictions.length > 0 && (
              <Card className="arc-glass-card-prism prism-section-card lg:hidden">
                <CardHeader className="pb-2">
                  <h2 className="text-base font-semibold">Recent forecasts</h2>
                </CardHeader>
                <CardContent className="prism-scroll-panel max-h-[30vh] space-y-2">
                  {predictions.slice(0, 5).map((p) => (
                    <div key={p.id} className="arc-glass-card arc-glass-card-prism arc-glass-interactive p-3">
                      <div className="flex justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium text-white">{p.event}</p>
                        <Badge variant="prism">{p.probability}%</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <MeridianFooter className="mt-6 pb-4" />
      </div>
    </div>
  );
}
