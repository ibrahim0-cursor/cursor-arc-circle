"use client";

import { Brain } from "lucide-react";
import { ArcToken3d } from "@/components/landing/arc-token-3d";
import type { CryptoId } from "@/components/landing/arc-crypto-icons";
import { cn } from "@/lib/utils";

const PORTAL_TOKENS: { id: CryptoId; angle: number; delay: number; duration: number }[] = [
  { id: "btc", angle: -90, delay: 0, duration: 4.2 },
  { id: "eth", angle: -18, delay: 0.85, duration: 4.2 },
  { id: "sol", angle: 54, delay: 1.7, duration: 4.2 },
  { id: "usdc", angle: 126, delay: 2.55, duration: 4.2 },
  { id: "usdt", angle: 198, delay: 3.4, duration: 4.2 },
];

/**
 * AI portal — coins jump in, processed at core, jump back out (loop).
 * Real token icons · 3D coins · no dot-globe.
 */
export function ArcPortalHero({ className = "" }: { className?: string }) {
  return (
    <div className={cn("arc-portal-hero", className)} aria-hidden>
      <div className="arc-portal-ambient" />

      <div className="arc-portal-tunnel arc-portal-tunnel-3" />
      <div className="arc-portal-tunnel arc-portal-tunnel-2" />
      <div className="arc-portal-tunnel arc-portal-tunnel-1" />

      <div className="arc-portal-void">
        <div className="arc-portal-ai-flash" />
        <div className="arc-portal-ai-core">
          <div className="arc-portal-ai-ring" />
          <Brain className="arc-portal-ai-icon" strokeWidth={1.4} />
          <span className="arc-portal-ai-label">AI</span>
        </div>
      </div>

      {PORTAL_TOKENS.map((t) => (
        <div
          key={t.id}
          className="arc-portal-lane"
          style={
            {
              "--lane-angle": `${t.angle}deg`,
              "--jump-dur": `${t.duration}s`,
              "--jump-delay": `${t.delay}s`,
            } as React.CSSProperties
          }
        >
          <ArcToken3d
            id={t.id}
            className="arc-portal-jumper"
            style={
              {
                animationDuration: `${t.duration}s`,
                animationDelay: `${t.delay}s`,
              } as React.CSSProperties
            }
          />
        </div>
      ))}

      <p className="arc-portal-live-tag">
        <span className="arc-live-dot" />
        Live intelligence routing
      </p>
    </div>
  );
}
