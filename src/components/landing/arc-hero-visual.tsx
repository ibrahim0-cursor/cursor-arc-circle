"use client";

import { motion } from "framer-motion";
import { Brain, Globe2, Zap } from "lucide-react";

/** Central 3D intelligence hub — homepage hero */
export function ArcHeroVisual() {
  return (
    <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block" style={{ perspective: 900 }}>
      <motion.div
        className="absolute inset-8 rounded-full border border-cyan-400/20"
        style={{ boxShadow: "0 0 80px rgba(56,189,248,0.15), inset 0 0 40px rgba(20,217,154,0.08)" }}
        animate={{ rotateZ: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="arc-panel absolute inset-[18%] flex items-center justify-center rounded-3xl"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateX: [10, 16, 10], rotateY: [-8, 8, -8] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 shadow-[0_8px_32px_rgba(20,217,154,0.25)]">
            <Brain className="h-7 w-7 text-emerald-300" strokeWidth={1.25} />
          </div>
          <p className="arc-caption text-emerald-300/80">Core AI</p>
          <p className="mt-1 font-mono text-xs text-white/50">NEXUS ↔ PRISM</p>
        </div>
      </motion.div>
      {[
        { Icon: Zap, label: "NEXUS", pos: "left-[4%] top-[22%]", color: "text-emerald-400" },
        { Icon: Globe2, label: "PRISM", pos: "right-[2%] bottom-[24%]", color: "text-amber-400" },
      ].map(({ Icon, label, pos, color }, i) => (
        <motion.div
          key={label}
          className={`arc-panel absolute ${pos} flex items-center gap-2 px-3 py-2`}
          animate={{ y: [0, i % 2 ? 8 : -8, 0] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
          style={{ transform: "translateZ(40px)" }}
        >
          <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.5} />
          <span className="text-xs font-semibold text-white/85">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}
