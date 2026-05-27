"use client";

import { motion } from "framer-motion";
import { Bot, Brain, Database, Loader2, Sparkles, Zap } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const metrics = [
  { icon: Zap, label: "Live roster", sub: "Stable tokens · 45s refresh" },
  { icon: Bot, label: "TA + AI", sub: "RSI · MACD · whale risk" },
  { icon: Sparkles, label: "Wallet grade", sub: "Score every wallet A–F" },
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
    <section className="nexus-premium-hero arc-panel arc-panel-nexus mb-3 hidden overflow-hidden sm:mb-8 sm:block">
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <div className="nexus-premium-hero-glow" aria-hidden />
      <div className="relative grid gap-6 p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-2xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <ArcIcon3d icon={Zap} theme="nexus" size="md" />
            <div>
              <p className="arc-caption text-violet-300/90">ARC CIRCLE · NEXUS</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="nexus">AI Agent</Badge>
                <Badge variant="default" className="border-violet-400/35 bg-violet-500/15 text-violet-100">
                  RSI · MACD · Whales
                </Badge>
              </div>
            </div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="arc-display nexus-premium-title text-left"
          >
            <span className="block text-white/95">Autonomous</span>
            <span className="arc-gradient-text block">crypto intelligence</span>
          </motion.h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--arc-text-muted)] sm:text-base">
            Live market feed, institutional glass panels, and AI BUY · SELL · HOLD — Arc fees ~${feeUsd}/tx.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 lg:max-w-md lg:items-end">
          <Button
            variant="outline"
            className="arc-btn-pill arc-glass-interactive min-h-[44px] w-full gap-2 sm:w-auto"
            onClick={onMemoryScan}
            disabled={scanning || alphaScanning || arcFeePending}
          >
            {scanning || arcFeePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArcIconBadge icon={Database} theme="nexus" size="sm" />
            )}
            Memory Scan
          </Button>
          <Button
            variant="outline"
            className={cn(
              "arc-btn-pill arc-glass-interactive min-h-[44px] w-full gap-2 border-violet-400/30 sm:w-auto",
              alphaScanning && "arc-ai-pulse",
            )}
            onClick={onAlphaScan}
            disabled={scanning || alphaScanning || arcFeePending}
          >
            {alphaScanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArcIconBadge icon={Sparkles} theme="nexus" size="sm" />
            )}
            Alpha Scan
          </Button>
          <Button
            variant="nexus"
            className="arc-btn-pill arc-glass-interactive min-h-[44px] w-full gap-2 sm:w-auto"
            onClick={onDeepResearch}
            disabled={researching || arcFeePending || !hasSelectedToken}
          >
            {researching || arcFeePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArcIconBadge icon={Brain} theme="nexus" size="sm" />
            )}
            Deep Research
          </Button>
        </div>
      </div>

      <div className="relative grid gap-3 border-t border-white/[0.06] px-4 pb-4 sm:grid-cols-3 sm:px-8 sm:pb-6 sm:pt-5">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.06 }}
            className="arc-glass-card arc-glass-card-nexus arc-glass-interactive flex items-center gap-3 px-4 py-3"
          >
            <ArcIcon3d icon={m.icon} theme="nexus" size="sm" delay={i * 0.12} />
            <div>
              <p className="text-sm font-semibold text-white">{m.label}</p>
              <p className="arc-caption">
                {i === 0 ? `${stableCount} stable tokens · 45s` : m.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
