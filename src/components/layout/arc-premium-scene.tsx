"use client";

import { motion } from "framer-motion";
import { ArcDotGlobe } from "@/components/layout/arc-dot-globe";

/** Starfield + violet energy + optional globe (home hero) */
export function ArcPremiumScene({
  theme = "home",
  showGlobe = false,
}: {
  theme?: "home" | "nexus" | "prism";
  showGlobe?: boolean;
}) {
  const glow =
    theme === "nexus"
      ? "rgba(18, 232, 168, 0.45)"
      : theme === "prism"
        ? "rgba(245, 158, 11, 0.4)"
        : "rgba(168, 85, 247, 0.55)";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="arc-starfield absolute inset-0" />
      <div
        className="arc-ambient-bloom absolute left-1/2 top-[8%] h-[min(720px,70vh)] w-[min(900px,95vw)] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: `radial-gradient(ellipse at center, ${glow}, transparent 68%)` }}
      />
      {theme === "home" && (
        <motion.div
          className="arc-energy-beam absolute left-1/2 top-0 h-full w-px -translate-x-1/2"
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {showGlobe && (
        <div className="absolute left-1/2 top-[12%] h-[min(520px,55vh)] w-[min(520px,90vw)] -translate-x-1/2 opacity-90">
          <ArcDotGlobe className="h-full w-full" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030405]/40 to-[#030405]" />
    </div>
  );
}
