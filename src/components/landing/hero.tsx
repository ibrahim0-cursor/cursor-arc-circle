"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, LineChart, Shield, Sparkles, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function LandingHero() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-4xl"
      >
        <Badge className="mb-6">Agora Agents Hackathon · Circle × Arc</Badge>
        <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-white md:text-7xl">
          Agents that trade.
          <span className="block bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
            Oracles that predict.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
          ARC CIRCLE ships two production-grade AI agents on Arc testnet —{" "}
          <strong className="text-white">NEXUS</strong> for autonomous market execution and{" "}
          <strong className="text-white">PRISM</strong> for macro and geopolitical forecasting.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/nexus">
            <Button variant="nexus" size="lg">
              Launch NEXUS <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/prism">
            <Button variant="prism" size="lg">
              Launch PRISM <Sparkles className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {[
          {
            icon: LineChart,
            title: "Real market intelligence",
            copy: "DexScreener, GDELT, NewsAPI, and long-form AI reasoning stitched into one operator console.",
          },
          {
            icon: Shield,
            title: "Arc + Circle settlement",
            copy: "Every agent action pays USDC fees on Arc testnet — sub-second finality with Circle wallet primitives.",
          },
          {
            icon: BrainCircuit,
            title: "Built to win UI/UX",
            copy: "Premium glass interface designed for judges, demo day, and live user traction in under two weeks.",
          },
        ].map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * index, duration: 0.6 }}
          >
            <Card className="h-full">
              <CardContent className="pt-6">
                <item.icon className="mb-4 h-6 w-6 text-cyan-300" />
                <h3 className="text-lg font-medium text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/55">{item.copy}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function ProductShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="overflow-hidden border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.08] to-transparent">
          <CardContent className="p-8">
            <Badge variant="nexus">NEXUS</Badge>
            <h2 className="mt-4 text-3xl font-semibold text-white">Autonomous Trading Agent</h2>
            <p className="mt-3 text-white/60">
              Scans trending pairs, reasons over liquidity and momentum, and publishes BUY / SELL / HOLD
              decisions with confidence, risk score, and Arc-anchored audit trails.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2"><Waves className="h-4 w-4 text-cyan-300" /> DexScreener live market feed</li>
              <li className="flex items-center gap-2"><Waves className="h-4 w-4 text-cyan-300" /> OpenAI decision engine</li>
              <li className="flex items-center gap-2"><Waves className="h-4 w-4 text-cyan-300" /> Circle agent wallet + Arc anchoring</li>
            </ul>
            <Link href="/nexus" className="mt-8 inline-block">
              <Button variant="nexus">Open NEXUS Console</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-violet-400/20 bg-gradient-to-br from-violet-400/[0.08] to-transparent">
          <CardContent className="p-8">
            <Badge variant="prism">PRISM</Badge>
            <h2 className="mt-4 text-3xl font-semibold text-white">Macro & Geopolitical Oracle</h2>
            <p className="mt-3 text-white/60">
              Synthesizes GDELT crisis signals and live news into calibrated probabilities, Kelly sizing,
              and conviction cards for Fed, oil, conflict, and policy events.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2"><Waves className="h-4 w-4 text-violet-300" /> Claude long-reasoning forecasts</li>
              <li className="flex items-center gap-2"><Waves className="h-4 w-4 text-violet-300" /> GDELT + NewsAPI intelligence layer</li>
              <li className="flex items-center gap-2"><Waves className="h-4 w-4 text-violet-300" /> Shareable prediction ledger on Arc</li>
            </ul>
            <Link href="/prism" className="mt-8 inline-block">
              <Button variant="prism">Open PRISM Oracle</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
