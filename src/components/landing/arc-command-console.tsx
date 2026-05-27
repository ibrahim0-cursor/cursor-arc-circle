"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Brain,
  Globe2,
  Layers,
  Radio,
  Scan,
  Shield,
  Zap,
} from "lucide-react";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";

const modules = [
  { icon: Zap, label: "NEXUS", sub: "Crypto terminal", variant: "nexus" as const },
  { icon: Globe2, label: "PRISM", sub: "Macro oracle", variant: "prism" as const },
  { icon: Scan, label: "ALPHA", sub: "6-layer scan", variant: "nexus" as const },
  { icon: Radio, label: "PULSE", sub: "Social velocity", variant: "home" as const },
  { icon: Brain, label: "AI", sub: "Groq thesis", variant: "home" as const },
  { icon: Shield, label: "RISK", sub: "Probabilistic", variant: "neutral" as const },
];

const feed = [
  { tag: "NEXUS", text: "Smart-wallet accumulation detected · Base ecosystem" },
  { tag: "PRISM", text: "Fed probability shift +2.4% · macro pulse elevated" },
  { tag: "ARC", text: "Narrative acceleration · Social Data X velocity ↑" },
  { tag: "SYS", text: "Agent memory sync · 15 tokens archived" },
];

/** Hero right column — live command console (no floating balls) */
export function ArcCommandConsole() {
  return (
    <div className="arc-command-console relative hidden lg:block">
      <div className="arc-signal-panel arc-border-trace p-0">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <div className="flex items-center gap-3">
            <ArcIconFrame icon={Layers} variant="home" size="sm" active />
            <div>
              <p className="arc-caption text-cyan-300/80">Live command layer</p>
              <p className="font-mono text-xs text-white/55">ARC_SIGNAL v2</p>
            </div>
          </div>
          <span className="arc-live-dot font-mono text-[10px] uppercase tracking-widest text-emerald-400">
            Online
          </span>
        </div>

        <div className="grid grid-cols-3 gap-px bg-white/[0.06] p-px">
          {modules.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 * i }}
              className="flex flex-col items-center gap-2 bg-[#080a0e] p-4"
            >
              <ArcIconFrame icon={m.icon} variant={m.variant} size="md" />
              <span className="font-mono text-[11px] font-semibold tracking-wider text-white">{m.label}</span>
              <span className="text-[9px] uppercase tracking-wider text-white/40">{m.sub}</span>
            </motion.div>
          ))}
        </div>

        <div className="border-t border-white/[0.08] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-cyan-400/80" strokeWidth={1.5} />
            <p className="arc-caption">Intelligence stream</p>
          </div>
          <ul className="space-y-2">
            {feed.map((row, i) => (
              <motion.li
                key={row.tag}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.12 }}
                className="flex gap-2 font-mono text-[11px] leading-relaxed"
              >
                <span className="shrink-0 text-emerald-400/90">[{row.tag}]</span>
                <span className="text-white/62">{row.text}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
