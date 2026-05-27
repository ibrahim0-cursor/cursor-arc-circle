"use client";

import { ArcToken3d } from "@/components/landing/arc-token-3d";
import type { CryptoId } from "@/components/landing/arc-crypto-icons";
import { cn } from "@/lib/utils";

const ORBIT_TOKENS: { id: CryptoId; angle: number; delay: number; floatDelay: number }[] = [
  { id: "btc", angle: -90, delay: 0, floatDelay: 0 },
  { id: "eth", angle: -18, delay: 1.04, floatDelay: 0.35 },
  { id: "sol", angle: 54, delay: 2.08, floatDelay: 0.7 },
  { id: "usdc", angle: 126, delay: 3.12, floatDelay: 1.05 },
  { id: "usdt", angle: 198, delay: 4.16, floatDelay: 1.4 },
];

/** Continuous orbit + floating 3D coins around AI core */
export function ArcPortalOrbit({
  logos,
  className,
}: {
  logos: Record<CryptoId, string>;
  className?: string;
}) {
  return (
    <div className={cn("arc-portal-orbit-spin", className)}>
      {ORBIT_TOKENS.map((t) => (
        <div
          key={t.id}
          className="arc-portal-orbit-slot"
          style={
            {
              "--slot-angle": `${t.angle}deg`,
              "--dive-delay": `${t.delay}s`,
              "--float-delay": `${t.floatDelay}s`,
            } as React.CSSProperties
          }
        >
          <div className="arc-portal-orbit-upright">
            <div className="arc-portal-orbit-float">
              <div className="arc-portal-orbit-dive">
                <ArcToken3d id={t.id} size="lg" logoSrc={logos[t.id]} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
