"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Brain,
  Globe2,
  LineChart,
  Radar,
  Radio,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  { label: "Narrative layers", value: "6+", sub: "Acceleration · flow · risk" },
  { label: "Data planes", value: "12+", sub: "On-chain · social · macro" },
  { label: "Agent modes", value: "2", sub: "NEXUS · PRISM" },
];

export function ArcEcosystemHero() {
  return (
    <section className="relative mx-auto max-w-[1680px] px-4 pb-10 pt-8 sm:px-6 sm:pt-14">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
        <p className="arc-caption mb-3 text-cyan-200/70">ARC CIRCLE · Intelligence Operating System</p>
        <h1 className="font-semibold tracking-tight text-[var(--arc-text)]">
          <span className="block text-3xl sm:text-5xl md:text-6xl">Autonomous intelligence</span>
          <span className="mt-2 block bg-gradient-to-r from-emerald-300/90 via-cyan-200/80 to-indigo-300/70 bg-clip-text text-2xl text-transparent sm:text-4xl">
            for markets and geopolitics
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--arc-text-muted)] sm:text-base">
          <strong className="text-white/95">NEXUS</strong> runs crypto alpha, smart-money signals, and agent trading on Arc.
          <strong className="text-white/95"> PRISM</strong> models macro and geopolitical probability with live intelligence feeds.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/nexus" className="w-full sm:w-auto">
            <Button variant="nexus" size="lg" className="min-h-[48px] w-full sm:w-auto">
              Enter NEXUS <Zap className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/prism" className="w-full sm:w-auto">
            <Button variant="prism" size="lg" className="min-h-[48px] w-full sm:w-auto">
              Enter PRISM <Radar className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="mt-12 grid gap-3 sm:grid-cols-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i }}
            className="arc-panel arc-hover-lift relative overflow-hidden p-4 sm:p-5"
          >
            <p className="arc-caption">{m.label}</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-white">{m.value}</p>
            <p className="mt-1 text-xs text-white/50">{m.sub}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function ArcIntelligenceGrid() {
  const cells = [
    { icon: Radio, title: "Live narrative detection", copy: "Social Data X, news, Telegram, Discord, Reddit velocity." },
    { icon: LineChart, title: "Market pulse", copy: "DexScreener, Birdeye whales, GeckoTerminal trending." },
    { icon: Globe2, title: "Geopolitical pulse", copy: "GDELT, macro news, PRISM probability engine." },
    { icon: Brain, title: "AI reasoning layer", copy: "Groq thesis per token — why opportunity matters." },
    { icon: Activity, title: "Agent orchestration", copy: "Memory scan, Alpha scan, autopilot vault on Arc." },
    { icon: Shield, title: "Risk intelligence", copy: "Rug, liquidity, concentration, hype exhaustion scores." },
  ];

  return (
    <section className="mx-auto max-w-[1680px] px-4 py-12 sm:px-6">
      <p className="arc-caption mb-2">System capabilities</p>
      <h2 className="text-xl font-semibold text-white sm:text-2xl">Intelligence infrastructure</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cells.map((c, i) => (
          <Card key={c.title} className="arc-hover-lift h-full border-[var(--arc-border)]">
            <CardContent className="p-5">
              <c.icon className="mb-3 h-5 w-5 text-emerald-400/90" strokeWidth={1.5} />
              <h3 className="text-base font-semibold text-white">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/58">{c.copy}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function ArcSystemsShowcase() {
  return (
    <section className="mx-auto max-w-[1680px] px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="arc-panel-nexus arc-hover-lift overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <Badge variant="nexus">NEXUS · Financial terminal</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-white">Crypto command center</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/62">
              Alpha scan (20 tokens), memory archive, smart-money flow, AI thesis, demo trades with Arc USDC fees.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-emerald-100/75">
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> 6-layer probabilistic alpha
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> Live feed · chart · trade panel
              </li>
            </ul>
            <Link href="/nexus" className="mt-6 inline-block">
              <Button variant="nexus">Launch NEXUS</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="arc-panel-prism arc-hover-lift overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <Badge variant="prism">PRISM · Strategic intelligence</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-white">Geopolitical oracle</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/62">
              Fed, oil, sanctions, custom events — calibrated probabilities with community and news overlays.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-amber-100/75">
              <li className="flex gap-2">
                <Radar className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> Macro + crisis signal fusion
              </li>
              <li className="flex gap-2">
                <Radar className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> Kelly-sized forecast outputs
              </li>
            </ul>
            <Link href="/prism" className="mt-6 inline-block">
              <Button variant="prism">Launch PRISM</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function ArcHomeFooter() {
  return (
    <footer className="border-t border-[var(--arc-border)] px-6 py-12">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-white/90">ARC CIRCLE</p>
          <p className="mt-1 text-xs text-white/45">NEXUS + PRISM · Circle × Arc Testnet</p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm text-white/55">
          <Link href="/nexus" className="hover:text-emerald-300">
            NEXUS
          </Link>
          <Link href="/prism" className="hover:text-amber-300">
            PRISM
          </Link>
          <a href="https://github.com/ibrahim0-cursor/cursor-arc-circle" className="hover:text-white">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
