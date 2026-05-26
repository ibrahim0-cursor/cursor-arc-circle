"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe2, Loader2, Radar, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MeshBackground } from "@/components/layout/mesh-background";
import { formatCompact, formatPct, truncateHash } from "@/lib/utils";
import type { PrismPrediction } from "@/lib/storage";
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
        message: `${data.prediction.probability}% probability · scrolling to report`,
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
    <div className="relative min-h-screen text-white">
      <MeshBackground variant="prism" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 pb-12 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="prism">PRISM</Badge>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Macro Oracle
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
              Live macro context + GDELT + news → clear probability &amp; Kelly size. Tap an event, hit Forecast.
            </p>
          </div>
          <Button
            variant="prism"
            onClick={analyze}
            disabled={loading}
            className="min-h-[48px] w-full shrink-0 text-base sm:w-auto"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Generate Forecast
          </Button>
        </div>

        {market && (
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <MacroChip
              label="BTC"
              price={market.btcPrice}
              change={market.btcChange24h}
            />
            <MacroChip label="ETH" price={market.ethPrice} change={market.ethChange24h} />
            <MacroChip
              label="Total cap"
              price={market.totalMarketCapUsd}
              change={market.marketCapChange24h}
              compact
            />
            <div className="col-span-2 flex items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-100/80 sm:col-span-1">
              CoinGecko · live
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4 sm:space-y-6">
            <Card className="border-violet-400/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-violet-300" />
                  <h2 className="text-base font-semibold sm:text-lg">Choose event</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelected(event.id)}
                    className={`w-full min-h-[52px] rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] ${
                      selected === event.id
                        ? "border-violet-400/45 bg-violet-500/15"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white sm:text-base">{event.label}</span>
                      <Badge variant="prism">{event.category}</Badge>
                    </div>
                  </button>
                ))}
                <textarea
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  placeholder="Or type your own event…"
                  className="min-h-[88px] w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-base text-white outline-none placeholder:text-white/35 focus:border-violet-400/45"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Radar className="h-5 w-5 text-violet-300" />
                  <h2 className="text-base font-semibold sm:text-lg">Intel feed</h2>
                </div>
              </CardHeader>
              <CardContent className="max-h-[40vh] space-y-2 overflow-y-auto sm:max-h-none">
                {(latestIntel?.gdelt ?? []).slice(0, 4).map((item, index) => (
                  <IntelRow key={`g-${index}`} source={item.source} title={item.title} />
                ))}
                {(latestIntel?.news ?? []).slice(0, 3).map((item, index) => (
                  <IntelRow key={`n-${index}`} source={item.source} title={item.title} />
                ))}
                {!latestIntel && (
                  <p className="py-4 text-center text-sm text-white/55">
                    Tap <strong className="text-violet-200">Generate Forecast</strong> to load GDELT + news.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div id="prism-forecast" className="scroll-mt-24 space-y-4 sm:space-y-6">
            <Card className="overflow-hidden border-violet-400/25">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-transparent p-6 sm:p-8">
                  <p className="text-xs font-medium uppercase tracking-widest text-violet-200/80">
                    Probability
                  </p>
                  <div className="mt-3 flex items-end gap-2">
                    <p className="text-6xl font-bold leading-none sm:text-7xl">{latest?.probability ?? "—"}</p>
                    {latest && <p className="pb-2 text-2xl text-white/50">%</p>}
                  </div>
                  <p className="mt-4 text-base leading-relaxed text-white/85 sm:text-lg">
                    {latest?.event ?? "Select an event to start."}
                  </p>
                  {latest && (
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <MiniStat label="Confidence" value={`${latest.confidence}%`} />
                      <MiniStat label="Kelly" value={`${(latest.kellyFraction * 100).toFixed(1)}%`} />
                      <MiniStat label="Horizon" value={latest.horizon} />
                    </div>
                  )}
                </div>
                {latest && (
                  <div className="space-y-3 p-5 sm:p-8">
                    <p className="nexus-lead">{latest.summary}</p>
                    <p className="text-sm leading-relaxed text-white/70 sm:text-base">{latest.reasoning}</p>
                    {latest.arcTxHash && (
                      <p className="text-xs text-white/45">Arc · {truncateHash(latest.arcTxHash, 10, 8)}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-violet-300" />
                  <h2 className="text-base font-semibold sm:text-lg">History</h2>
                </div>
              </CardHeader>
              <CardContent className="max-h-[50vh] space-y-3 overflow-y-auto">
                {predictions.length === 0 ? (
                  <p className="text-sm text-white/55">No forecasts yet.</p>
                ) : (
                  predictions.map((prediction, index) => (
                    <motion.div
                      key={prediction.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="rounded-xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-white">{prediction.event}</p>
                        <Badge variant="prism">{prediction.probability}%</Badge>
                      </div>
                      <p className="mt-2 text-sm text-white/60 line-clamp-2">{prediction.summary}</p>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
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
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white sm:text-base">
        {compact ? formatCompact(price) : `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
      </p>
      <p className={`mt-0.5 flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-300" : "text-rose-300"}`}>
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
    neutral: "border-violet-400/20 bg-violet-500/8",
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
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
