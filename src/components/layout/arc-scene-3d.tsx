"use client";

import { motion } from "framer-motion";

/** Ambient 3D depth layer — floating intelligence orbs */
export function ArcScene3D({ theme = "home" }: { theme?: "home" | "nexus" | "prism" }) {
  const primary =
    theme === "nexus" ? "#10b981" : theme === "prism" ? "#f59e0b" : "#22d3ee";
  const secondary =
    theme === "nexus" ? "#06b6d4" : theme === "prism" ? "#ef4444" : "#818cf8";

  return (
    <div className="arc-scene-3d pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="arc-orb absolute left-[8%] top-[18%] h-32 w-32 sm:h-48 sm:w-48"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${primary}55, transparent 68%)`,
          boxShadow: `0 0 80px ${primary}33`,
        }}
        animate={{ y: [0, -18, 0], rotateZ: [0, 8, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="arc-orb absolute right-[12%] top-[28%] h-24 w-24 sm:h-40 sm:w-40"
        style={{
          background: `radial-gradient(circle at 40% 40%, ${secondary}44, transparent 70%)`,
          boxShadow: `0 0 60px ${secondary}28`,
        }}
        animate={{ y: [0, 14, 0], rotateZ: [0, -12, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="arc-orb absolute bottom-[22%] left-[38%] h-20 w-20 sm:h-36 sm:w-36"
        style={{
          background: `radial-gradient(circle, ${primary}33, transparent 65%)`,
        }}
        animate={{ x: [0, 22, 0], y: [0, -10, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      {/* Temporal ring — "4D" pulse */}
      <motion.div
        className="absolute left-1/2 top-[42%] h-[min(520px,70vw)] w-[min(520px,70vw)] -translate-x-1/2 rounded-full border border-white/[0.06]"
        style={{
          boxShadow: `inset 0 0 60px ${primary}12, 0 0 40px ${primary}08`,
        }}
        animate={{ scale: [0.92, 1.04, 0.92], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-[42%] h-[min(380px,55vw)] w-[min(380px,55vw)] -translate-x-1/2 rounded-full border border-dashed border-white/[0.08]"
        animate={{ rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
