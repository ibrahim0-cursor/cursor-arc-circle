"use client";

import { ArcHudScene } from "@/components/layout/arc-hud-scene";
import { ArcPremiumScene } from "@/components/layout/arc-premium-scene";

/** Premium ambient — starfield, glow, optional dot-globe on home */
export function ArcBackground({
  theme = "home",
  showGlobe = false,
}: {
  theme?: "home" | "nexus" | "prism";
  showGlobe?: boolean;
}) {
  const line =
    theme === "nexus"
      ? "rgba(34, 211, 238, 0.1)"
      : theme === "prism"
        ? "rgba(245, 158, 11, 0.1)"
        : "rgba(168, 85, 247, 0.12)";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" data-arc-theme={theme}>
      <div className="absolute inset-0 bg-[var(--arc-bg)]" />
      <ArcPremiumScene theme={theme} showGlobe={showGlobe} />
      <div className="arc-grid-floor absolute inset-x-0 top-0 h-[45vh] opacity-[0.12]" style={{ color: line }} />
      <ArcHudScene theme={theme} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030405]" />
    </div>
  );
}
