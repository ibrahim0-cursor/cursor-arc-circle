"use client";

import { motion } from "framer-motion";
import { NexusHudLiveTouch } from "@/components/nexus/nexus-hud-live-touch";
import { cn } from "@/lib/utils";

/**
 * ARC SIGNAL ambient layer — HUD brackets, scan lines, hex lattice.
 * No floating balls or playful orbs.
 */
export function ArcHudScene({ theme = "home" }: { theme?: "home" | "nexus" | "prism" }) {
  const accent =
    theme === "nexus" ? "rgba(20, 217, 154, 0.55)" : theme === "prism" ? "rgba(245, 158, 11, 0.5)" : "rgba(56, 189, 248, 0.45)";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Hex lattice */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 0 L56 16 V48 L28 64 L0 48 V16 Z' fill='none' stroke='white' stroke-opacity='0.08'/%3E%3C/svg%3E")`,
          backgroundSize: "56px 100px",
        }}
      />

      {/* Corner HUD brackets */}
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <div
          key={c}
          className={cn(
            "arc-hud-bracket absolute h-16 w-16 sm:h-24 sm:w-24",
            c === "tl" && "left-4 top-4 border-l-2 border-t-2",
            c === "tr" && "right-4 top-4 border-r-2 border-t-2",
            c === "bl" && "bottom-4 left-4 border-b-2 border-l-2",
            c === "br" && "bottom-4 right-4 border-b-2 border-r-2",
          )}
          style={{ borderColor: accent }}
        />
      ))}

      {/* Horizontal scan — softer on NEXUS so it does not read as text */}
      <motion.div
        className={cn("arc-scan-line absolute left-0 right-0 h-px", theme === "nexus" && "opacity-30")}
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        animate={{ top: ["12%", "88%", "12%"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />

      {/* Vertical data columns */}
      <div className="absolute inset-y-0 right-[6%] hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent md:block" />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute right-[5%] hidden w-[2px] rounded-full md:block"
          style={{
            top: `${12 + i * 16}%`,
            height: `${8 + (i % 3) * 4}%`,
            background: accent,
          }}
          animate={{ opacity: [0.15, 0.7, 0.15], scaleY: [0.8, 1, 0.8] }}
          transition={{ duration: 2.2 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
        />
      ))}

      {/* PRISM: radar sweep line (not a ball) */}
      {theme === "prism" && (
        <motion.div
          className="absolute left-1/2 top-[30%] h-[min(420px,55vh)] w-px origin-bottom -translate-x-1/2"
          style={{
            background: `linear-gradient(to top, ${accent}, transparent)`,
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* NEXUS: live-touch strip (no text ticker) */}
      {theme === "nexus" && <NexusHudLiveTouch />}
    </div>
  );
}
