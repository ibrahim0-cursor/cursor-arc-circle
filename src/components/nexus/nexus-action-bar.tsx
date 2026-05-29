"use client";

import { Loader2, Sparkles } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { nexusGlassCta } from "@/lib/nexus-action-glass";
import { cn } from "@/lib/utils";

export function NexusActionBar({
  onAlphaScan,
  alphaScanning,
  alphaCount,
  disabled,
}: {
  onAlphaScan: () => void;
  alphaScanning: boolean;
  alphaCount: number;
  disabled?: boolean;
}) {
  return (
    <div className="nexus-action-bar mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2.5 sm:px-4">
      <button
        type="button"
        onClick={onAlphaScan}
        disabled={disabled || alphaScanning}
        className={cn(
          nexusGlassCta(
            "alpha",
            "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm sm:flex-none sm:min-w-[200px]",
          ),
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {alphaScanning ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ArcIcon3d icon={Sparkles} theme="nexus" size="sm" static className="!h-7 !w-7" />
        )}
        {alphaScanning ? "Alpha scan running…" : "Run Alpha Scan"}
      </button>
      <p className="w-full text-center text-[11px] text-white/50 sm:ml-auto sm:w-auto sm:text-right">
        {alphaCount > 0 ? `${alphaCount} ranked picks ready` : "Agent finds movers · you get BUY/SELL/HOLD"}
      </p>
    </div>
  );
}
