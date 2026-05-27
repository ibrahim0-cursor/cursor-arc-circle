"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";
import { ArcPortalOrbit } from "@/components/landing/arc-portal-orbit";
import { usePortalTokenLogos } from "@/hooks/use-portal-token-logos";
import { cn } from "@/lib/utils";

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  angle: (i / 14) * 360,
  delay: i * 0.35,
}));

/** Live AI portal — CoinGecko logos + floating 3D orbit */
export function ArcPortalHero({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const logos = usePortalTokenLogos();

  return (
    <div className={cn("arc-portal-hero", className)} aria-hidden>
      <div className="arc-portal-stage">
        <div className="arc-portal-glow-field" />

        <div className="arc-portal-vortex">
          <div className="arc-portal-vortex-ring arc-portal-vortex-ring-1" />
          <div className="arc-portal-vortex-ring arc-portal-vortex-ring-2" />
          <div className="arc-portal-vortex-ring arc-portal-vortex-ring-3" />
          <div className="arc-portal-vortex-ring arc-portal-vortex-ring-4" />
          <div className="arc-portal-vortex-spiral" />
        </div>

        {!reduced &&
          PARTICLES.map((p) => (
            <span
              key={p.angle}
              className="arc-portal-particle"
              style={
                {
                  "--p-angle": `${p.angle}deg`,
                  "--p-delay": `${p.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}

        <ArcPortalOrbit logos={logos} />

        <div className="arc-portal-horizon">
          <motion.div
            className="arc-portal-ai-burst"
            animate={reduced ? undefined : { opacity: [0, 0, 0.9, 0, 0], scale: [0.8, 0.8, 1.25, 0.8, 0.8] }}
            transition={{ duration: 5.2, repeat: Infinity, times: [0, 0.46, 0.5, 0.54, 1] }}
          />
          <motion.div
            className="arc-portal-core"
            animate={
              reduced
                ? undefined
                : {
                    boxShadow: [
                      "0 0 28px rgba(18, 232, 168, 0.2), inset 0 0 20px rgba(139, 92, 246, 0.15)",
                      "0 0 28px rgba(18, 232, 168, 0.2), inset 0 0 20px rgba(139, 92, 246, 0.15)",
                      "0 0 48px rgba(34, 211, 238, 0.55), 0 0 80px rgba(168, 85, 247, 0.45), inset 0 0 28px rgba(18, 232, 168, 0.35)",
                      "0 0 28px rgba(18, 232, 168, 0.2), inset 0 0 20px rgba(139, 92, 246, 0.15)",
                    ],
                  }
            }
            transition={{ duration: 5.2, repeat: Infinity, times: [0, 0.46, 0.52, 1] }}
          >
            <div className="arc-portal-core-scan" />
            <div className="arc-portal-core-ring" />
            <Sparkles className="arc-portal-core-spark" strokeWidth={1.25} />
            <Brain className="arc-portal-core-icon" strokeWidth={1.35} />
            <span className="arc-portal-core-label">AI CORE</span>
          </motion.div>
        </div>
      </div>

      <p className="arc-portal-live-tag">
        <span className="arc-live-dot" />
        Live intelligence routing
      </p>
    </div>
  );
}
