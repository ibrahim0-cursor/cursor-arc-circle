"use client";

import { ArcToken3d } from "@/components/landing/arc-token-3d";
import type { PortalTokenId } from "@/lib/portal-tokens";
import { cn } from "@/lib/utils";

/** Four planets, 90° spacing — BTC top, ETH right, SOL bottom, USDC left */
const PLANETS: { id: PortalTokenId; angle: number; spinDelay: number }[] = [
  { id: "btc", angle: -90, spinDelay: 0 },
  { id: "eth", angle: 0, spinDelay: 2.5 },
  { id: "sol", angle: 90, spinDelay: 5 },
  { id: "usdc", angle: 180, spinDelay: 7.5 },
];

/**
 * Solar system — single orbit, even spacing, 3D live planets (no USDT).
 */
export function ArcPortalOrbit({
  logos,
  className,
}: {
  logos: Record<PortalTokenId, string>;
  className?: string;
}) {
  return (
    <div className={cn("arc-solar-system", className)}>
      <div className="arc-solar-orbit-plane">
        <div className="arc-solar-track" aria-hidden />
        <div className="arc-solar-ring">
          {PLANETS.map((p, i) => (
            <div
              key={p.id}
              className="arc-solar-planet-slot"
              style={
                {
                  "--planet-angle": `${p.angle}deg`,
                  "--planet-i": i,
                  "--spin-delay": `${p.spinDelay}s`,
                } as React.CSSProperties
              }
            >
              <div className="arc-solar-planet-upright">
                <ArcToken3d
                  id={p.id}
                  size="xl"
                  logoSrc={logos[p.id]}
                  planet
                  style={{ "--spin-delay": `${p.spinDelay}s` } as React.CSSProperties}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
