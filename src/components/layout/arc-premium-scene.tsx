"use client";

import { motion } from "framer-motion";
import { ArcDotGlobe } from "@/components/layout/arc-dot-globe";

/** Per-route ambient: home globe · NEXUS terminal grid · PRISM oracle rings */
export function ArcPremiumScene({
  theme = "home",
  showGlobe = false,
}: {
  theme?: "home" | "nexus" | "prism";
  showGlobe?: boolean;
}) {
  const glow =
    theme === "nexus"
      ? "rgba(18, 232, 168, 0.42)"
      : theme === "prism"
        ? "rgba(251, 146, 60, 0.48)"
        : "rgba(168, 85, 247, 0.55)";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="arc-starfield absolute inset-0" />

      <div
        className="arc-ambient-bloom absolute left-1/2 top-[6%] h-[min(780px,75vh)] w-[min(960px,98vw)] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ background: `radial-gradient(ellipse at center, ${glow}, transparent 70%)` }}
      />

      {theme === "home" && (
        <>
          {showGlobe && (
            <div className="absolute left-1/2 top-[10%] h-[min(520px,52vh)] w-[min(520px,92vw)] -translate-x-1/2 opacity-90">
              <ArcDotGlobe className="h-full w-full" />
            </div>
          )}
        </>
      )}

      {theme === "nexus" && (
        <>
          <div className="arc-nexus-grid absolute inset-0 opacity-[0.35]" />
          <motion.div
            className="absolute bottom-[12%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
            animate={{ opacity: [0.2, 0.85, 0.2], scaleX: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute h-[40%] w-px bg-gradient-to-b from-transparent via-emerald-400/25 to-transparent"
              style={{ left: `${22 + i * 28}%`, top: "8%" }}
              animate={{ opacity: [0.1, 0.5, 0.1] }}
              transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.6 }}
            />
          ))}
        </>
      )}

      {theme === "prism" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-[18%] -translate-x-1/2 rounded-full border border-amber-400/25"
              style={{
                width: `${min(520, 280 + i * 90)}px`,
                height: `${min(520, 280 + i * 90)}px`,
              }}
              animate={{
                opacity: [0.12, 0.38 - i * 0.06, 0.12],
                scale: [0.98, 1.02, 0.98],
              }}
              transition={{ duration: 6 + i * 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
            />
          ))}
          <motion.div
            className="absolute left-1/2 top-[32%] h-[min(380px,45vh)] w-px origin-bottom -translate-x-1/2 bg-gradient-to-t from-amber-400/70 via-amber-200/30 to-transparent"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030405]/35 to-[#030405]" />
    </div>
  );
}

function min(a: number, b: number) {
  return a < b ? a : b;
}
