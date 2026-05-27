"use client";

import { ArcDotGlobe } from "@/components/layout/arc-dot-globe";
import { cn } from "@/lib/utils";

const ORBIT_TOKENS = [
  { id: "btc", label: "₿", duration: 13, delay: 0, size: 94, variant: "btc" as const },
  { id: "eth", label: "Ξ", duration: 17, delay: -4, size: 108, variant: "eth" as const },
  { id: "sol", label: "◎", duration: 11, delay: -7, size: 88, variant: "sol" as const },
  { id: "usdc", label: "USDC", duration: 20, delay: -2, size: 112, variant: "usdc" as const },
  { id: "usdt", label: "₮", duration: 15, delay: -9, size: 100, variant: "usdt" as const },
] as const;

/**
 * Professional dot-matrix portal — globe center + rings + 5 tokens in orbit.
 * CSS orbit (GPU); globe canvas unchanged.
 */
export function ArcPortalHero({ className = "" }: { className?: string }) {
  return (
    <div className={cn("arc-portal-hero", className)} aria-hidden>
      <div className="arc-portal-hero-glow" />
      <div className="arc-portal-ring arc-portal-ring-outer" />
      <div className="arc-portal-ring arc-portal-ring-inner" />
      <div className="arc-portal-lens" />

      <div className="arc-portal-globe-layer">
        <ArcDotGlobe className="h-full w-full" />
      </div>

      {ORBIT_TOKENS.map((t) => (
        <div
          key={t.id}
          className="arc-portal-orbit"
          style={
            {
              "--orbit-size": `${t.size}%`,
              "--orbit-dur": `${t.duration}s`,
              "--orbit-delay": `${t.delay}s`,
            } as React.CSSProperties
          }
        >
          <div className={cn("arc-portal-token", `arc-portal-token-${t.variant}`)}>
            <span>{t.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
