"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe2, Loader2, Radar, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MeshBackground } from "@/components/layout/mesh-background";
import { truncateHash } from "@/lib/utils";
import type { PrismPrediction } from "@/lib/storage";

type EventOption = {
  id: string;
  label: string;
  category: "macro" | "geopolitical" | "markets";
};

export function PrismConsole() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selected, setSelected] = useState<string>("fed-cut-june");
  const [customEvent, setCustomEvent] = useState("");
  const [predictions, setPredictions] = useState<PrismPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [latestIntel, setLatestIntel] = useState<{ gdelt: Array<{ title: string; source: string }>; news: Array<{ title: string; source: string }> } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/prism/predictions");
    setPredictions(await res.json());
    const eventsRes = await fetch("/api/prism/events");
    setEvents(await eventsRes.json());
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
      setLatestIntel(data.intelligence);
      setPredictions((prev) => [data.prediction, ...prev]);
    } finally {
      setLoading(false);
    }
  }

  const latest = predictions[0];

  return (
    <div className="relative min-h-screen text-white">
      <MeshBackground variant="prism" />
      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="prism">PRISM</Badge>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Macro & Geopolitical Oracle
            </h1>
            <p className="mt-2 max-w-2xl text-white/60">
              GDELT crisis intelligence + live news + Claude reasoning → calibrated probabilities and Kelly sizing.
            </p>
          </div>
          <Button variant="prism" onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Forecast
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <Card className="border-violet-400/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-violet-300" />
                  <h2 className="text-lg font-medium">Event universe</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelected(event.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selected === event.id
                        ? "border-violet-400/40 bg-violet-400/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white/90">{event.label}</span>
                      <Badge variant="prism">{event.category}</Badge>
                    </div>
                  </button>
                ))}
                <textarea
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  placeholder="Or enter a custom macro / geopolitical event…"
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/40"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Radar className="h-5 w-5 text-violet-300" />
                  <h2 className="text-lg font-medium">Intelligence layer</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(latestIntel?.gdelt ?? []).slice(0, 4).map((item, index) => (
                  <IntelRow key={`g-${index}`} source={item.source} title={item.title} />
                ))}
                {(latestIntel?.news ?? []).slice(0, 3).map((item, index) => (
                  <IntelRow key={`n-${index}`} source={item.source} title={item.title} />
                ))}
                {!latestIntel && (
                  <p className="text-sm text-white/50">Run a forecast to populate GDELT and NewsAPI signals.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden border-violet-400/20">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-violet-500/20 via-amber-400/10 to-transparent p-8">
                  <p className="text-sm uppercase tracking-[0.22em] text-violet-200/70">Latest probability</p>
                  <div className="mt-4 flex items-end gap-4">
                    <p className="text-7xl font-semibold leading-none">{latest?.probability ?? "—"}</p>
                    <p className="pb-2 text-2xl text-white/50">{latest ? "%" : ""}</p>
                  </div>
                  <p className="mt-4 max-w-xl text-lg text-white/75">{latest?.event ?? "Select an event to begin."}</p>
                  {latest && (
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <MiniStat label="Confidence" value={`${latest.confidence}%`} />
                      <MiniStat label="Kelly size" value={`${(latest.kellyFraction * 100).toFixed(1)}%`} />
                      <MiniStat label="Horizon" value={latest.horizon} />
                    </div>
                  )}
                </div>
                {latest && (
                  <div className="space-y-4 p-8">
                    <p className="text-white/80">{latest.summary}</p>
                    <p className="text-sm leading-7 text-white/60">{latest.reasoning}</p>
                    {latest.arcTxHash && (
                      <p className="text-xs text-white/40">Arc anchor · {truncateHash(latest.arcTxHash)}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-violet-300" />
                  <h2 className="text-lg font-medium">Prediction ledger</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {predictions.length === 0 ? (
                  <p className="text-white/50">No forecasts yet.</p>
                ) : (
                  predictions.map((prediction, index) => (
                    <motion.div
                      key={prediction.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white/90">{prediction.event}</p>
                        <Badge variant="prism">{prediction.probability}%</Badge>
                      </div>
                      <p className="mt-2 text-sm text-white/55">{prediction.summary}</p>
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

function IntelRow({ source, title }: { source: string; title: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">{source}</p>
      <p className="mt-1 text-sm text-white/75">{title}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 font-medium text-white">{value}</p>
    </div>
  );
}
