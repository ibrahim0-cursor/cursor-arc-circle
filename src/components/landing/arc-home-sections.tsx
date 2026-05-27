"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Brain,
  Globe2,
  LineChart,
  Radar,
  Radio,
  ScanLine,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";
import { ArcCommandConsole } from "@/components/landing/arc-command-console";

const metrics = [
  { icon: ScanLine, label: "Narrative layers", value: "06", sub: "Acceleration · flow · risk" },
  { icon: Radio, label: "Data planes", value: "12", sub: "On-chain · social · macro" },
  { icon: Activity, label: "Agent systems", value: "02", sub: "NEXUS · PRISM" },
];

export function ArcEcosystemHero() {
  return (
    <section className="relative mx-auto max-w-[1680px] px-4 pb-12 pt-10 sm:px-6 sm:pt-16">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="mb-6 flex items-center gap-3">
            <ArcIconFrame icon={Sparkles} variant="home" size="sm" active />
            <p className="arc-caption text-cyan-300/75">ARC CIRCLE · Intelligence Operating System</p>
          </div>
          <h1 className="arc-display text-white">
            <span className="block">Command</span>
            <span className="arc-gradient-text block">global intelligence</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--arc-text-muted)]">
            Institutional-grade AI for markets and geopolitics. One interface — two autonomous systems — built to
            win attention before the first trade.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/nexus" className="w-full sm:w-auto">
              <Button variant="nexus" size="lg" className="arc-btn-signal min-h-[52px] w-full gap-2 sm:w-auto">
                <Zap className="h-5 w-5" strokeWidth={1.5} />
                Launch NEXUS
                <ArrowUpRight className="h-4 w-4 opacity-70" />
              </Button>
            </Link>
            <Link href="/prism" className="w-full sm:w-auto">
              <Button variant="prism" size="lg" className="arc-btn-signal min-h-[52px] w-full gap-2 sm:w-auto">
                <Radar className="h-5 w-5" strokeWidth={1.5} />
                Launch PRISM
                <ArrowUpRight className="h-4 w-4 opacity-70" />
              </Button>
            </Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.65 }}
        >
          <ArcCommandConsole />
        </motion.div>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="arc-signal-panel arc-border-trace flex gap-4 p-5"
          >
            <ArcIconFrame icon={m.icon} variant="home" size="md" />
            <div>
              <p className="arc-caption">{m.label}</p>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-white">{m.value}</p>
              <p className="mt-1 text-xs text-white/48">{m.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function ArcIntelligenceGrid() {
  const cells = [
    { icon: Radio, title: "Narrative velocity", copy: "Social Data X, Telegram, Discord, news acceleration." },
    { icon: LineChart, title: "Market pulse", copy: "DexScreener, Birdeye whales, GeckoTerminal flow." },
    { icon: Globe2, title: "Geopolitical pulse", copy: "GDELT, macro feeds, PRISM probability engine." },
    { icon: Brain, title: "AI reasoning", copy: "Explainable thesis — why the opportunity matters." },
    { icon: Wallet, title: "Smart money", copy: "Whale tracking, holder concentration, buy pressure." },
    { icon: Shield, title: "Risk matrix", copy: "Rug, liquidity, hype exhaustion — scored live." },
  ];

  return (
    <section className="mx-auto max-w-[1680px] px-4 py-14 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="arc-caption mb-2 text-cyan-300/70">Capabilities</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Intelligence infrastructure
          </h2>
        </div>
        <ArcIconFrame icon={ScanLine} variant="home" size="md" active />
      </div>
      <div className="arc-signal-panel arc-border-trace mt-8 divide-y divide-white/[0.06]">
        {cells.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="arc-feature-row"
          >
            <ArcIconFrame icon={c.icon} variant={i % 2 === 0 ? "nexus" : "home"} size="md" />
            <div>
              <h3 className="text-base font-semibold text-white">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{c.copy}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function ArcSystemsShowcase() {
  return (
    <section className="mx-auto max-w-[1680px] px-4 pb-20 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          whileHover={{ y: -4 }}
          className="arc-signal-panel arc-signal-panel-nexus arc-border-trace p-6 sm:p-8"
        >
          <Badge variant="nexus">NEXUS</Badge>
          <div className="mt-5 flex items-start gap-4">
            <ArcIconFrame icon={Zap} variant="nexus" size="lg" active />
            <div>
              <h2 className="text-2xl font-semibold text-white">Financial command terminal</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                Alpha scan, memory archive, smart-money signals, AI thesis, Arc-native demo execution.
              </p>
            </div>
          </div>
          <Link href="/nexus" className="mt-8 inline-block">
            <Button variant="nexus" className="arc-btn-signal gap-2">
              Enter terminal <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="arc-signal-panel arc-signal-panel-prism arc-border-trace p-6 sm:p-8"
        >
          <Badge variant="prism">PRISM</Badge>
          <div className="mt-5 flex items-start gap-4">
            <ArcIconFrame icon={Globe2} variant="prism" size="lg" active />
            <div>
              <h2 className="text-2xl font-semibold text-white">Strategic macro oracle</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                Fed, oil, sanctions, custom events — calibrated probabilities with live intelligence overlays.
              </p>
            </div>
          </div>
          <Link href="/prism" className="mt-8 inline-block">
            <Button variant="prism" className="arc-btn-signal gap-2">
              Enter oracle <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export function ArcHomeFooter() {
  return (
    <footer className="border-t border-white/[0.08] px-6 py-14">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ArcIconFrame icon={Sparkles} variant="home" size="md" />
          <div>
            <p className="font-mono text-sm font-semibold tracking-[0.18em] text-white">ARC CIRCLE</p>
            <p className="arc-caption mt-1">NEXUS + PRISM · Arc Testnet</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-6 font-mono text-xs uppercase tracking-widest text-white/50">
          <Link href="/nexus" className="transition hover:text-emerald-300">
            NEXUS
          </Link>
          <Link href="/prism" className="transition hover:text-amber-300">
            PRISM
          </Link>
          <a href="https://github.com/ibrahim0-cursor/cursor-arc-circle" className="transition hover:text-white">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
