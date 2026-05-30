"use client";

import { ExternalLink, Sparkles, Zap } from "lucide-react";
import {
  CIRCLE_AGENTS_DOCS_URL,
  CIRCLE_AGENTS_MARKETPLACE_URL,
} from "@/lib/circle-agents";

const ITEMS = [
  { label: "Circle Agents", href: CIRCLE_AGENTS_MARKETPLACE_URL, accent: "text-cyan-200" },
  { label: "x402", href: CIRCLE_AGENTS_DOCS_URL, accent: "text-violet-200" },
] as const;

export function NexusCircleAgentsTopBanner() {
  return (
    <div className="nexus-circle-agents-banner relative mb-3 overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/[0.12] via-violet-500/[0.1] to-emerald-500/[0.08] px-3 py-2.5 shadow-[0_0_32px_rgba(34,211,238,0.12)] sm:mb-4 sm:px-4 sm:py-3">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 120% at 10% 50%, rgba(34,211,238,0.25), transparent 55%), radial-gradient(ellipse 60% 100% at 90% 50%, rgba(139,92,246,0.2), transparent 50%)",
        }}
      />
      <div className="relative flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/15">
            <Zap className="h-4 w-4 text-cyan-200" />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-100/90 sm:text-xs">
            Agent payments
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
          aria-label="Circle Agents and x402"
        >
          {ITEMS.map((item, i) => (
            <span key={item.label} className="flex items-center gap-1.5 sm:gap-2">
              {i > 0 && (
                <span className="text-[10px] font-light text-white/25" aria-hidden>
                  ·
                </span>
              )}
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] font-semibold transition hover:border-cyan-400/35 hover:bg-black/40 sm:text-xs ${item.accent}`}
              >
                {item.label === "Circle Agents" && (
                  <Sparkles className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                )}
                {item.label}
                <ExternalLink className="h-2.5 w-2.5 opacity-40 group-hover:opacity-80" />
              </a>
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
