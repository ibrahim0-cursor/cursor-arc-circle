"use client";

import { ArcToken3d } from "@/components/landing/arc-token-3d";
import type { PortalTokenId } from "@/lib/portal-tokens";
import { cn } from "@/lib/utils";

/** 90° spacing — BTC top · ETH right · SOL bottom · USDC left */
const PLANETS: { id: PortalTokenId; angle: number }[] = [
  { id: "btc", angle: -90 },
  { id: "eth", angle: 0 },
  { id: "sol", angle: 90 },
  { id: "usdc", angle: 180 },
];

/** Flat orbit: coins stay straight (face camera) while rotating around AI core */
export function ArcPortalOrbit({
  logos,
  className,
}: {
  logos: Record<PortalTokenId, string>;
  className?: string;
}) {
  return (
    <div className={cn("arc-solar-system", className)}>
      <div className="arc-solar-track" aria-hidden />
      <div className="arc-solar-ring">
        {PLANETS.map((p) => (
          <div
            key={p.id}
            className="arc-solar-planet-slot"
            style={{ "--planet-angle": `${p.angle}deg` } as React.CSSProperties}
          >
            <div className="arc-solar-planet-upright">
              <ArcToken3d id={p.id} size="xl" logoSrc={logos[p.id]} planet />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
