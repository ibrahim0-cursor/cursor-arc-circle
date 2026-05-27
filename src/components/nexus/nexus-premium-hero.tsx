"use client";

import { Radio, Sparkles } from "lucide-react";

/** Slim strip — main controls live in the feed column tabs */
export function NexusPremiumHero({ stableCount }: { stableCount: number; feeUsd?: string | number; alphaScanning?: boolean; arcFeePending?: boolean; onAlphaScan?: () => void }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 sm:px-4">
      <p className="text-xs text-white/55 sm:text-sm">
        <span className="font-semibold text-white">NEXUS</span> — Live Feed ({stableCount} movers) · Alpha Scan · Swap · Trade · Portfolio
      </p>
      <span className="hidden items-center gap-1 text-[10px] text-violet-300/80 sm:inline-flex">
        <Sparkles className="h-3 w-3" /> Alpha
      </span>
      <span className="hidden items-center gap-1 text-[10px] text-emerald-300/80 sm:inline-flex">
        <Radio className="h-3 w-3" /> Live
      </span>
    </div>
  );
}
