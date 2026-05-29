"use client";

import { motion } from "framer-motion";
import { Globe2, LineChart, Loader2, Radar, Target } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { Badge } from "@/components/ui/badge";
import { prismGlassCta } from "@/lib/prism-action-glass";
import { cn } from "@/lib/utils";

type PrismPremiumHeroProps = {
  loading: boolean;
  onAnalyze: () => void;
};

/** PRISM workspace intro — home/NEXUS glass + 3D icon parity */
export function PrismPremiumHero({ loading, onAnalyze }: PrismPremiumHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="arc-glass-card arc-glass-card-prism arc-border-trace prism-workspace-intro relative mb-4 overflow-hidden p-4 pt-5 sm:mb-6 sm:p-5 sm:pt-6"
    >
      <div className="arc-panel-stripe arc-panel-stripe-prism absolute inset-x-0 top-0 h-1" />
      <div className="prism-premium-hero-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ArcIcon3d icon={Globe2} theme="prism" size="md" delay={0} />
          <div className="min-w-0">
            <Badge variant="prism" className="mb-1">
              PRISM
            </Badge>
            <p className="arc-caption text-amber-200/85">MERIDIAN · PRISM</p>
            <h1 className="prism-workspace-title mt-1 text-xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
              Cross-market <span className="arc-gradient-text">Intelligence</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--arc-text-muted)]">
              Cross-market crypto intelligence engine — macro, geopolitics, liquidity, and onchain transmission
              into calibrated crypto forecasts.
            </p>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={loading}
              className={cn(
                prismGlassCta("forecast", "arc-btn-pill mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 text-base sm:mt-5 sm:w-auto sm:px-8"),
                loading && "arc-ai-pulse",
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArcIcon3d icon={Target} theme="prism" size="sm" static />
              )}
              Generate Forecast
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {[
            { icon: Radar, label: "Intel", sub: "GDELT + news" },
            { icon: LineChart, label: "Macro", sub: "Live markets" },
            { icon: Globe2, label: "Events", sub: "Fed · oil · geo" },
          ].map((m, i) => (
            <div
              key={m.label}
              className="arc-glass-card arc-glass-card-prism flex items-center gap-2 rounded-xl px-3 py-2"
            >
              <ArcIcon3d icon={m.icon} theme="prism" size="sm" delay={i * 0.15} />
              <div>
                <p className="text-[11px] font-semibold text-white">{m.label}</p>
                <p className="text-[10px] text-white/45">{m.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
