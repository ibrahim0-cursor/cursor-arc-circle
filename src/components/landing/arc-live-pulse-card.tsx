"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

/** Sellix-style glass toast over hero globe */
export function ArcLivePulseCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="arc-glass-card arc-live-pulse absolute right-[4%] top-[42%] z-20 hidden max-w-[220px] p-3 lg:block"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/25">
          <Zap className="h-5 w-5 text-violet-200" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/45">Signal detected</p>
          <p className="text-sm font-medium text-white">Alpha scan complete</p>
          <p className="font-mono text-[10px] text-emerald-400">+12 opportunities</p>
        </div>
      </div>
    </motion.div>
  );
}
