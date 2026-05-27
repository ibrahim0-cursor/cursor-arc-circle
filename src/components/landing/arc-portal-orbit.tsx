"use client";

import { ArcToken3d } from "@/components/landing/arc-token-3d";
import type { CryptoId } from "@/components/landing/arc-crypto-icons";
import { cn } from "@/lib/utils";

type Planet = {
  id: CryptoId;
  angle: number;
  ring: "inner" | "outer";
};

/** Solar system layout — inner planets + BTC on outer orbit (bottom) */
const PLANETS: Planet[] = [
  { id: "sol", angle: 225, ring: "inner" },
  { id: "usdc", angle: 315, ring: "inner" },
  { id: "usdt", angle: 45, ring: "inner" },
  { id: "eth", angle: 135, ring: "inner" },
  { id: "btc", angle: 90, ring: "outer" },
];

/**
 * Tokens orbit AI core like a solar system — steady rotation only, no swim/dive.
 */
export function ArcPortalOrbit({
  logos,
  className,
}: {
  logos: Record<CryptoId, string>;
  className?: string;
}) {
  const inner = PLANETS.filter((p) => p.ring === "inner");
  const outer = PLANETS.filter((p) => p.ring === "outer");

  return (
    <div className={cn("arc-solar-system", className)}>
      <div className="arc-solar-track arc-solar-track-inner" aria-hidden />
      <div className="arc-solar-track arc-solar-track-outer" aria-hidden />

      <div className="arc-solar-ring arc-solar-ring-inner">
        {inner.map((p) => (
          <PlanetSlot key={p.id} planet={p} logos={logos} />
        ))}
      </div>

      <div className="arc-solar-ring arc-solar-ring-outer">
        {outer.map((p) => (
          <PlanetSlot key={p.id} planet={p} logos={logos} />
        ))}
      </div>
    </div>
  );
}

function PlanetSlot({
  planet,
  logos,
}: {
  planet: Planet;
  logos: Record<CryptoId, string>;
}) {
  return (
    <div
      className={cn("arc-solar-planet-slot", planet.ring === "outer" && "arc-solar-planet-slot-outer")}
      style={{ "--planet-angle": `${planet.angle}deg` } as React.CSSProperties}
    >
      <div className="arc-solar-planet-upright">
        <ArcToken3d id={planet.id} size="lg" logoSrc={logos[planet.id]} planet />
      </div>
    </div>
  );
}
