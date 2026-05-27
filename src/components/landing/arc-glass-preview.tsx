"use client";

import { motion } from "framer-motion";
import { ArrowRightLeft, LineChart, TrendingUp, Wallet } from "lucide-react";

/** Cryptox / EXORA style floating glass dashboard preview */
export function ArcGlassPreview() {
  return (
    <div className="arc-glass-preview relative mx-auto mt-10 max-w-4xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <div className="arc-glass-card p-4 md:translate-y-6">
          <div className="mb-3 flex items-center gap-2 text-xs text-white/50">
            <LineChart className="h-4 w-4 text-violet-300" />
            Market pulse
          </div>
          {["NEXUS", "ARC", "BASE"].map((sym, i) => (
            <div key={sym} className="mb-2 flex items-center justify-between font-mono text-xs">
              <span className="text-white/80">{sym}</span>
              <span className={i === 0 ? "text-emerald-400" : "text-white/45"}>
                {i === 0 ? "+4.2%" : "+1.1%"}
              </span>
            </div>
          ))}
        </div>

        <div className="arc-glass-card arc-glass-card-hero p-5 md:-translate-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-violet-200" />
              <span className="text-sm font-medium text-white">Intelligence vault</span>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">LIVE</span>
          </div>
          <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-white">$24,891</p>
          <p className="mt-1 text-xs text-white/45">Demo portfolio · Arc testnet</p>
          <div className="mt-4 h-16 overflow-hidden rounded-xl bg-gradient-to-t from-violet-500/20 to-transparent">
            <svg viewBox="0 0 200 48" className="h-full w-full" preserveAspectRatio="none">
              <motion.path
                d="M0,40 Q50,8 100,28 T200,12"
                fill="none"
                stroke="url(#arcLine)"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2 }}
              />
              <defs>
                <linearGradient id="arcLine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div className="arc-glass-card p-4 md:translate-y-8">
          <div className="mb-3 flex items-center gap-2 text-xs text-white/50">
            <ArrowRightLeft className="h-4 w-4 text-cyan-300" />
            Agent swap
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/40">From</p>
            <p className="font-mono text-sm text-white">2.5 ETH</p>
          </div>
          <div className="my-2 flex justify-center">
            <TrendingUp className="h-4 w-4 text-violet-300" />
          </div>
          <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Receive</p>
            <p className="font-mono text-sm text-white">12,400 ARC</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
