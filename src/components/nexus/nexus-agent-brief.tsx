"use client";

import { Sparkles } from "lucide-react";
import { NEXUS_AGENT_LAYERS, NEXUS_INTEL_BRIEF } from "@/lib/nexus-copy";

export function NexusAgentBrief() {
  return (
    <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.06] px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-violet-200" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/90">
          Why NEXUS · how the agent works
        </p>
      </div>
      <p className="text-[11px] leading-relaxed text-white/70">{NEXUS_INTEL_BRIEF}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {NEXUS_AGENT_LAYERS.map((layer) => (
          <li
            key={layer}
            className="rounded-md border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-white/55"
          >
            {layer}
          </li>
        ))}
      </ul>
    </div>
  );
}
