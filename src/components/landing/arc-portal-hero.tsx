"use client";

import { cn } from "@/lib/utils";

/** Portal + BTC/ETH pass-through — CSS only (smooth, no canvas) */
export function ArcPortalHero({ className = "" }: { className?: string }) {
  return (
    <div className={cn("arc-portal-hero", className)} aria-hidden>
      <div className="arc-portal-hero-glow" />
      <div className="arc-portal-ring arc-portal-ring-outer" />
      <div className="arc-portal-ring arc-portal-ring-inner" />
      <div className="arc-portal-core">
        <div className="arc-portal-vortex" />
      </div>
      <div className="arc-portal-coin-track">
        <div className="arc-portal-coin arc-portal-coin-btc">
          <span>₿</span>
        </div>
      </div>
      <div className="arc-portal-coin-track arc-portal-coin-track-alt">
        <div className="arc-portal-coin arc-portal-coin-eth">
          <span>Ξ</span>
        </div>
      </div>
    </div>
  );
}
