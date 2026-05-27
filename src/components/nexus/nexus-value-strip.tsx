"use client";

import { Bot, Check, Sparkles } from "lucide-react";
import { NEXUS_AUTOMATES, NEXUS_TAGLINE, NEXUS_VALUE_STEPS } from "@/lib/nexus-copy";

/** Why NEXUS exists vs dense terminals (GMGN-style manual research) */
export function NexusValueStrip() {
  return (
    <section className="mb-3 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-950/40 via-black/50 to-emerald-950/30 px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15">
          <Bot className="h-5 w-5 text-violet-200" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white sm:text-base">AI agent · not a pro terminal</p>
          <p className="mt-1 text-xs leading-relaxed text-white/55 sm:text-sm">{NEXUS_TAGLINE}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {NEXUS_VALUE_STEPS.map((step, i) => (
          <div
            key={step.title}
            className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90">
              {i + 1}. {step.title}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-white/55">{step.detail}</p>
          </div>
        ))}
      </div>

      <details className="mt-3 group">
        <summary className="cursor-pointer list-none text-[11px] font-medium text-white/45 hover:text-white/70">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            What the agent handles for you (vs manual research)
          </span>
        </summary>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {NEXUS_AUTOMATES.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/60"
            >
              <Check className="h-3 w-3 text-emerald-400/80" />
              {item}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
