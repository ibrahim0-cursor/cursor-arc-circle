"use client";

import { motion } from "framer-motion";

const nodes = [
  { x: "8%", delay: 0, hue: "violet" },
  { x: "22%", delay: 0.4, hue: "emerald" },
  { x: "38%", delay: 0.8, hue: "cyan" },
  { x: "54%", delay: 0.2, hue: "violet" },
  { x: "70%", delay: 0.6, hue: "emerald" },
  { x: "86%", delay: 1, hue: "cyan" },
] as const;

const glow: Record<(typeof nodes)[number]["hue"], string> = {
  violet: "rgba(168, 85, 247, 0.55)",
  emerald: "rgba(18, 232, 168, 0.55)",
  cyan: "rgba(56, 189, 248, 0.5)",
};

/** Animated live-touch nodes — no ticker text */
export function NexusHudLiveTouch() {
  return (
    <div
      className="nexus-hud-live-touch absolute bottom-[16%] left-[6%] right-[6%] hidden h-12 sm:block"
      aria-hidden
    >
      <div className="relative h-full overflow-hidden rounded-xl border border-violet-500/15 bg-black/30 backdrop-blur-sm">
        <motion.div
          className="absolute inset-y-0 left-0 w-1/3"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.12), transparent)",
          }}
          animate={{ x: ["-30%", "130%"] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative flex h-full items-center justify-between px-4">
          {nodes.map((n, i) => (
            <motion.div
              key={i}
              className="nexus-live-touch-node"
              style={{
                boxShadow: `0 0 18px ${glow[n.hue]}, 0 0 6px ${glow[n.hue]}`,
              }}
              animate={{
                scale: [1, 1.35, 1],
                opacity: [0.45, 1, 0.45],
                y: [0, -4, 0],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: n.delay,
              }}
              whileHover={{ scale: 1.5, opacity: 1 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
