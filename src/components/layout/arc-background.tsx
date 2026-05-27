"use client";

import { ArcScene3D } from "@/components/layout/arc-scene-3d";

/** ARC intelligence atmosphere — depth grid + 3D ambient orbs */
export function ArcBackground({ theme = "home" }: { theme?: "home" | "nexus" | "prism" }) {
  const accent =
    theme === "nexus"
      ? "rgba(20, 217, 154, 0.1)"
      : theme === "prism"
        ? "rgba(245, 158, 11, 0.09)"
        : "rgba(56, 189, 248, 0.08)";

  const accent2 =
    theme === "nexus"
      ? "rgba(45, 212, 240, 0.06)"
      : theme === "prism"
        ? "rgba(168, 85, 247, 0.06)"
        : "rgba(124, 108, 240, 0.07)";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" data-arc-theme={theme}>
      <div className="absolute inset-0" style={{ background: "var(--arc-bg)" }} />
      <div className="absolute inset-x-0 top-0 h-[55vh] arc-grid-perspective overflow-hidden">
        <div className="arc-grid-bg h-full w-full" />
      </div>
      <ArcScene3D theme={theme} />
      <div
        className="absolute -left-1/4 top-0 h-[55vh] w-[55vw] rounded-full"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 68%)` }}
      />
      <div
        className="absolute -right-1/4 bottom-0 h-[45vh] w-[50vw] rounded-full"
        style={{ background: `radial-gradient(circle, ${accent2} 0%, transparent 70%)` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.15),transparent_30%,rgba(0,0,0,0.55))]" />
      {theme === "prism" && (
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `repeating-radial-gradient(circle at 50% 45%, transparent 0, transparent 36px, rgba(245,158,11,0.2) 37px, transparent 38px)`,
          }}
        />
      )}
      {theme === "nexus" && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent" />
      )}
    </div>
  );
}
