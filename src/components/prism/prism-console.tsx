"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe2, Loader2, Radar, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArcBackground } from "@/components/layout/arc-background";
import { MeridianFooter } from "@/components/layout/meridian-footer";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";
import { cn, formatCompact, formatPct, truncateHash } from "@/lib/utils";
import type { PrismPrediction } from "@/lib/storage";
import type { CommunityPulse } from "@/lib/community-pulse";
import { CommunityPulsePanel } from "@/components/shared/community-pulse-panel";
import { useToast } from "@/components/ui/toast-provider";

type EventOption = {
  id: string;
  label: string;
  category: "macro" | "geopolitical" | "markets";
};

type GlobalMarket = {
  btcPrice: number;
  btcChange24h: number;
  ethPrice: number;
  ethChange24h: number;
  totalMarketCapUsd: number;
  marketCapChange24h: number;
};

export function PrismConsole() {
  const toast = useToast();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selected, setSelected] = useState<string>("fed-cut-june");
  const [customEvent, setCustomEvent] = useState("");
  const [predictions, setPredictions] = useState<PrismPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [market, setMarket] = useState<GlobalMarket | null>(null);
  const [latestIntel, setLatestIntel] = useState<{
    gdelt: Array<{ title: string; source: string }>;
    news: Array<{ title: string; source: string }>;
    community?: CommunityPulse;
  } | null>(null);

  const load = useCallback(async () => {
    const [predRes, eventsRes, marketRes] = await Promise.all([
      fetch("/api/prism/predictions"),
      fetch("/api/prism/events"),
      fetch("/api/market/global"),
    ]);
    setPredictions(await predRes.json());
    setEvents(await eventsRes.json());
    const m = await marketRes.json();
    if (m.btcPrice) setMarket(m);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      <div className="relative mx-auto max-w-7xl px-3 py-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-10 sm:pb-12">
        <div className="arc-panel arc-panel-prism mb-4 sm:mb-8">
          <div className="arc-panel-stripe arc-panel-stripe-prism" />
          <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-start gap-4">
            <ArcIconFrame icon={Radar} variant="prism" size="lg" active />
            <div className="min-w-0 flex-1">
              <Badge variant="prism">PRISM</Badge>
              <h1 className="arc-gradient-text mt-2 text-2xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
                Macro Oracle
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--arc-text-muted)]">
                Pick an event → Generate Forecast. Live BTC/ETH macro on tap.
              </p>
              <Button
                variant="prism"
                onClick={analyze}
                disabled={loading}
                className={`arc-btn-pill arc-glass-interactive mt-4 min-h-[52px] w-full gap-2 text-base sm:mt-6 sm:w-auto ${loading ? "arc-ai-pulse" : ""}`}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Target className="h-5 w-5" strokeWidth={1.5} />
                )}
                Generate Forecast
              </Button>
            </div>
          </div>
          </div>
        </div>

        {market && (
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2">
              <MacroChip label="BTC" price={market.btcPrice} change={market.btcChange24h} />
              <MacroChip label="ETH" price={market.ethPrice} change={market.ethChange24h} />
              <MacroChip
                label="Mkt cap"
                price={market.totalMarketCapUsd}
                change={market.marketCapChange24h}
                compact
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-amber-200/70">CoinGecko · live</p>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_1.1fr] lg:gap-6">
          <div id="prism-forecast" className="order-1 scroll-mt-28 space-y-4 sm:space-y-6 lg:order-2">
            <Card className="arc-glass-card-prism overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent p-5 sm:p-8">
                  <p className="text-xs font-medium uppercase tracking-widest text-amber-200/80">Probability</p>
                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-5xl font-bold leading-none sm:text-7xl">{latest?.probability ?? "—"}</p>
                    {latest && <p className="pb-2 text-xl text-white/50">%</p>}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-lg">
                    {latest?.event ?? "Select an event below, then tap Generate Forecast."}
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

            <Card className="arc-glass-card-prism">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-amber-300" />
                  <h2 className="text-base font-semibold sm:text-lg">History</h2>
                </div>
              </CardHeader>
              <CardContent className="max-h-[36vh] space-y-3 overflow-y-auto sm:max-h-[50vh]">
                {predictions.length === 0 ? (
                  <p className="text-sm text-white/55">No forecasts yet.</p>
                ) : (
                  predictions.map((prediction, index) => (
                    <motion.div
                      key={prediction.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="arc-glass-card arc-glass-interactive p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-white">{prediction.event}</p>
                        <Badge variant="prism">{prediction.probability}%</Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-white/60">{prediction.summary}</p>
                      <p className="mt-1.5 line-clamp-2 text-xs text-amber-200/75">{prediction.reasoning}</p>
                      <p className="mt-1 text-[10px] text-white/45">
                        Confidence {prediction.confidence}% · Kelly {(prediction.kellyFraction * 100).toFixed(1)}%
                      </p>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="order-2 space-y-4 lg:order-1">
            <Card className="arc-glass-card-prism">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-300" />
                  <h2 className="text-base font-semibold">Choose event</h2>
                </div>
              </CardHeader>
              <CardContent className="max-h-[45vh] space-y-2 overflow-y-auto lg:max-h-none">
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

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Radar className="h-5 w-5 text-violet-300" />
                  <h2 className="text-base font-semibold">Intel feed</h2>
                </div>
              </CardHeader>
              <CardContent className="max-h-[35vh] space-y-2 overflow-y-auto lg:max-h-[28vh]">
                {(latestIntel?.gdelt ?? []).slice(0, 4).map((item, index) => (
                  <IntelRow key={`g-${index}`} source={item.source} title={item.title} />
                ))}
                {(latestIntel?.news ?? []).slice(0, 3).map((item, index) => (
                  <IntelRow key={`n-${index}`} source={item.source} title={item.title} />
                ))}
                {latestIntel?.community && latestIntel.community.items.length > 0 && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <CommunityPulsePanel pulse={latestIntel.community} title="Crypto community" compact />
                  </div>
                )}
                {!latestIntel && (
                  <p className="py-4 text-center text-sm text-white/55">
                    Tap <strong className="text-amber-200">Generate Forecast</strong> for GDELT, news, and community pulse.
                  </p>
                )}
              </CardContent>
            </Card>

            {predictions.length > 0 && (
              <Card className="lg:hidden">
                <CardHeader className="pb-2">
                  <h2 className="text-base font-semibold">Recent forecasts</h2>
                </CardHeader>
                <CardContent className="max-h-[30vh] space-y-2 overflow-y-auto">
                  {predictions.slice(0, 5).map((p) => (
                    <div key={p.id} className="arc-glass-card arc-glass-interactive p-3">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-medium text-white line-clamp-2">{p.event}</p>
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

function MacroChip({
  label,
  price,
  change,
  compact,
}: {
  label: string;
  price: number;
  change: number;
  compact?: boolean;
}) {
  const up = change >= 0;
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-2.5 py-2.5 text-center sm:px-3">
      <p className="text-[9px] uppercase tracking-wider text-white/45 sm:text-[10px]">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-white sm:text-base">
        {compact ? formatCompact(price) : `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
      </p>
      <p
        className={`mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-medium ${up ? "text-emerald-300" : "text-rose-300"}`}
      >
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {formatPct(change)}
      </p>
    </div>
  );
}

function sentimentFromTitle(title: string): "bullish" | "bearish" | "neutral" | "risk" {
  const t = title.toLowerCase();
  if (/crash|war|sanction|hack|collapse|fear|recession|downgrade|strike/i.test(t)) return "risk";
  if (/surge|rally|record|approval|cut|stimulus|peace|deal|growth|beat/i.test(t)) return "bullish";
  if (/drop|fall|selloff|inflation|hike|tightening|loss/i.test(t)) return "bearish";
  return "neutral";
}

function IntelRow({ source, title }: { source: string; title: string }) {
  const mood = sentimentFromTitle(title);
  const styles = {
    bullish: "border-emerald-400/30 bg-emerald-500/10",
    bearish: "border-rose-400/30 bg-rose-500/10",
    risk: "border-amber-400/35 bg-amber-500/12",
    neutral: "border-amber-400/20 bg-amber-500/8",
  };
  const labels = { bullish: "Risk-on", bearish: "Risk-off", risk: "Headline risk", neutral: "Macro" };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${styles[mood]}`}>
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">{source}</p>
        <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/70">
          {labels[mood]}
        </span>
      </div>
      <p className="mt-1 text-sm leading-snug text-white/90">{title}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="arc-glass-card arc-glass-interactive px-2 py-2 text-center sm:px-3">
      <p className="text-[9px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-white sm:text-sm">{value}</p>
    </div>
  );
}
