"use client";

import { ArcHudScene } from "@/components/layout/arc-hud-scene";

/** Matte intelligence backdrop — HUD + perspective grid only */
export function ArcBackground({ theme = "home" }: { theme?: "home" | "nexus" | "prism" }) {
  const line =
    theme === "nexus"
      ? "rgba(18, 232, 168, 0.12)"
      : theme === "prism"
        ? "rgba(245, 158, 11, 0.1)"
        : "rgba(56, 189, 248, 0.1)";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" data-arc-theme={theme}>
      <div className="absolute inset-0 bg-[var(--arc-bg)]" />
      <div className="arc-grid-floor absolute inset-x-0 top-0 h-[45vh]" style={{ color: line }} />
      <ArcHudScene theme={theme} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030405]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
