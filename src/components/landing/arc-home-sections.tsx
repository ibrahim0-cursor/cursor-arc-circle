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
import { ArcGlassPreview } from "@/components/landing/arc-glass-preview";
import { ArcLivePulseCard } from "@/components/landing/arc-live-pulse-card";

const metrics = [
  { icon: ScanLine, label: "Narrative layers", value: "06", sub: "Acceleration · flow · risk" },
  { icon: Radio, label: "Data planes", value: "12", sub: "On-chain · social · macro" },
  { icon: Activity, label: "Agent systems", value: "02", sub: "NEXUS · PRISM" },
];

export function ArcEcosystemHero() {
  return (
    <section className="arc-hero-centered relative mx-auto max-w-[1680px] px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
      <ArcLivePulseCard />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 mx-auto max-w-4xl text-center"
      >
        <div className="mb-6 flex items-center justify-center gap-3">
          <ArcIconFrame icon={Sparkles} variant="home" size="sm" active />
          <p className="arc-caption text-violet-300/80">ARC CIRCLE · Intelligence OS</p>
        </div>

        <h1 className="arc-display text-white">
          <span className="block">Autonomous</span>
          <span className="arc-gradient-text block">market intelligence</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--arc-text-muted)] sm:text-lg">
          Institutional AI for crypto and macro — glass-clear signals, six-layer alpha, and Arc-native execution.
          Built to win users at first glance.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/nexus" className="w-full sm:w-auto" data-cursor-hover>
            <Button variant="default" size="lg" className="arc-btn-pill min-h-[54px] w-full gap-2 px-8 sm:w-auto">
              Launch NEXUS
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/prism" className="w-full sm:w-auto" data-cursor-hover>
            <Button variant="outline" size="lg" className="arc-btn-pill min-h-[54px] w-full gap-2 border-white/20 px-8 sm:w-auto">
              <Radar className="h-5 w-5" strokeWidth={1.5} />
              Open PRISM
            </Button>
          </Link>
        </div>
      </motion.div>

      <ArcGlassPreview />

      <div className="relative z-10 mt-16 grid gap-4 sm:grid-cols-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="arc-glass-card flex gap-4 p-5"
            data-cursor-hover
          >
            <ArcIconFrame icon={m.icon} variant="home" size="md" />
            <div className="text-left">
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
    <section className="relative z-10 mx-auto max-w-[1680px] px-4 py-14 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="arc-caption mb-2 text-violet-300/70">Capabilities</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Intelligence infrastructure
          </h2>
        </div>
        <ArcIconFrame icon={ScanLine} variant="home" size="md" active />
      </div>
      <div className="arc-glass-card mt-8 divide-y divide-white/[0.06] overflow-hidden">
        {cells.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="arc-feature-row"
            data-cursor-hover
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
    <section className="relative z-10 mx-auto max-w-[1680px] px-4 pb-20 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div whileHover={{ y: -4 }} className="arc-glass-card p-6 sm:p-8" data-cursor-hover>
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
            <Button variant="nexus" className="arc-btn-pill gap-2">
              Enter terminal <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="arc-glass-card p-6 sm:p-8" data-cursor-hover>
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
            <Button variant="prism" className="arc-btn-pill gap-2">
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
    <footer className="relative z-10 border-t border-white/[0.08] px-6 py-14">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ArcIconFrame icon={Sparkles} variant="home" size="md" />
          <div>
            <p className="font-mono text-sm font-semibold tracking-[0.18em] text-white">ARC CIRCLE</p>
            <p className="arc-caption mt-1">NEXUS + PRISM · Arc Testnet</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-6 font-mono text-xs uppercase tracking-widest text-white/50">
          <Link href="/nexus" className="transition hover:text-emerald-300" data-cursor-hover>
            NEXUS
          </Link>
          <Link href="/prism" className="transition hover:text-amber-300" data-cursor-hover>
            PRISM
          </Link>
          <a
            href="https://github.com/ibrahim0-cursor/cursor-arc-circle"
            className="transition hover:text-white"
            data-cursor-hover
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
