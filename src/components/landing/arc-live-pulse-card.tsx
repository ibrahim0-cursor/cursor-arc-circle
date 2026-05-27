"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";

export function ArcLivePulseCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.45 }}
      className="arc-glass-card arc-live-pulse absolute right-[3%] top-[38%] z-20 hidden max-w-[220px] p-3 lg:block"
    >
      <div className="flex items-center gap-3">
        <ArcIcon3d icon={Zap} theme="home" size="sm" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/45">Signal detected</p>
          <p className="text-sm font-medium text-white">Alpha scan complete</p>
          <p className="font-mono text-[10px] text-emerald-400">+12 opportunities</p>
        </div>
      </div>
    </motion.div>
  );
}
