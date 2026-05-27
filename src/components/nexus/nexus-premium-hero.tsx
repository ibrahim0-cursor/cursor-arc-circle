"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  Cpu,
  Database,
  Radio,
  Shield,
  Sparkles,
} from "lucide-react";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { Badge } from "@/components/ui/badge";
import { NexusScanActions } from "@/components/nexus/nexus-scan-actions";
import { cn } from "@/lib/utils";

const stats = [
  { icon: Radio, label: "Live roster", sub: "stable tokens · 45s refresh", tone: "emerald" as const },
  { icon: BarChart3, label: "TA + AI", sub: "RSI · MACD · whale risk", tone: "violet" as const },
  { icon: Shield, label: "Wallet grade", sub: "Score every wallet A–F", tone: "cyan" as const },
] as const;

export function NexusPremiumHero({
  stableCount,
  feeUsd,
  scanning,
  alphaScanning,
  researching,
  arcFeePending,
  hasSelectedToken,
  onMemoryScan,
  onAlphaScan,
  onDeepResearch,
}: {
  stableCount: number;
  feeUsd: string | number;
  scanning: boolean;
  alphaScanning: boolean;
  researching: boolean;
  arcFeePending: boolean;
  hasSelectedToken: boolean;
  onMemoryScan: () => void;
  onAlphaScan: () => void;
  onDeepResearch: () => void;
}) {
  return (
    <section className="nexus-premium-hero arc-panel arc-panel-nexus mb-3 hidden overflow-hidden sm:mb-6 sm:block">
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <div className="nexus-premium-hero-glow" aria-hidden />
      <div className="relative space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start gap-4 lg:gap-6">
          <ArcIconFrame icon={Cpu} variant="home" size="lg" active className="shrink-0" />
          <div className="min-w-0 flex-1 max-w-3xl">
            <p className="arc-caption text-violet-300/90">ARC CIRCLE · NEXUS</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="nexus" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Agent
              </Badge>
              <Badge variant="default" className="border-violet-400/35 bg-violet-500/15 text-violet-100">
                RSI · MACD · Whales
              </Badge>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="arc-display nexus-premium-title mt-4 text-left"
            >
              <span className="block text-white/95">Autonomous</span>
              <span className="arc-gradient-text block">crypto intelligence</span>
            </motion.h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--arc-text-muted)] sm:text-base">
              Live market feed, institutional glass panels, and AI BUY · SELL · HOLD — Arc fees ~${feeUsd}/tx.
            </p>
          </div>
        </div>

        <div>
          <p className="arc-caption mb-2 text-emerald-200/80">Agent actions</p>
          <NexusScanActions
            actions={[
              {
                id: "memory",
                label: "Memory Scan",
                icon: Database,
                onClick: onMemoryScan,
                disabled: scanning || alphaScanning || researching,
                loading: scanning,
              },
              {
                id: "alpha",
                label: "Alpha Scan",
                icon: Sparkles,
                onClick: onAlphaScan,
                disabled: scanning || alphaScanning || researching || arcFeePending,
                loading: alphaScanning,
              },
              {
                id: "research",
                label: "Deep Research",
                icon: Brain,
                onClick: onDeepResearch,
                disabled: scanning || alphaScanning || researching || !hasSelectedToken,
                loading: researching,
              },
            ]}
          />
        </div>

        <div>
          <p className="arc-caption mb-2 text-white/40">System status</p>
          <div className="nexus-stats-row grid gap-2 sm:grid-cols-3">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "nexus-stat-chip flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
                  s.tone === "emerald" && "border-emerald-400/20 bg-emerald-500/[0.06]",
                  s.tone === "violet" && "border-violet-400/20 bg-violet-500/[0.06]",
                  s.tone === "cyan" && "border-cyan-400/20 bg-cyan-500/[0.06]",
                )}
              >
                <ArcIconBadge
                  icon={s.icon}
                  theme={s.tone === "emerald" ? "nexus" : s.tone === "violet" ? "home" : "neutral"}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/90">{s.label}</p>
                  <p className="text-[10px] leading-snug text-white/45">
                    {i === 0 ? `${stableCount} ${s.sub}` : s.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
