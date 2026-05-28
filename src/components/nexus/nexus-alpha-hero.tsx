"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { NEXUS_ALPHA_HERO_LINES, NEXUS_ALPHA_HERO_SUB } from "@/lib/nexus-copy";
import { cn } from "@/lib/utils";

const CYCLE_MS = 3200;

export function NexusAlphaHero({
  onAlphaScan,
  alphaScanning,
  alphaCount,
  disabled,
}: {
  onAlphaScan: () => void;
  alphaScanning: boolean;
  alphaCount: number;
  disabled?: boolean;
}) {
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLineIdx((i) => (i + 1) % NEXUS_ALPHA_HERO_LINES.length);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, []);

  const activeLine = NEXUS_ALPHA_HERO_LINES[lineIdx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="nexus-alpha-hero arc-glass-card arc-glass-card-nexus arc-border-trace nexus-premium-hero relative mb-4 overflow-hidden p-4 pt-5 sm:px-5 sm:py-5 sm:pt-6"
    >
      <div className="arc-panel-stripe arc-panel-stripe-nexus absolute inset-x-0 top-0 h-1" />
      <div className="nexus-alpha-hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-3">
            <ArcIcon3d icon={Sparkles} theme="nexus" size="md" delay={0.15} />
            <p className="arc-caption text-violet-300/85">NEXUS · Agent research</p>
          </div>

          <h1 className="nexus-workspace-title text-xl font-semibold tracking-tight text-white sm:text-2xl md:text-3xl">
            <span className="block text-white/90">Find alpha on</span>
            <span className="nexus-alpha-hero-cycle relative mt-0.5 block min-h-[1.35em] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={activeLine}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="arc-gradient-text absolute inset-x-0 top-0 block"
                >
                  {activeLine}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <p className="mt-2 max-w-xl text-xs leading-relaxed text-[var(--arc-text-muted)] sm:text-sm">
            {NEXUS_ALPHA_HERO_SUB}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            onClick={onAlphaScan}
            disabled={disabled || alphaScanning}
            className={cn(
              "arc-btn-pill arc-btn-signal inline-flex min-h-[52px] items-center justify-center gap-2.5 px-5 py-3 text-sm font-bold transition sm:min-w-[220px]",
              "border-violet-400/50 bg-gradient-to-r from-violet-600/45 to-fuchsia-600/35 text-violet-50",
              "hover:border-violet-300/60 hover:shadow-[0_0_28px_rgba(168,85,247,0.35)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              alphaScanning && "arc-ai-pulse",
            )}
          >
            {alphaScanning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {alphaScanning ? "Alpha scan running…" : "Run Alpha Scan"}
          </button>
          <p className="text-center text-[11px] text-white/45 sm:text-right">
            {alphaCount > 0
              ? `${alphaCount} ranked picks ready · see Alpha tab`
              : "Agent finds movers · you get BUY/SELL/HOLD"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
