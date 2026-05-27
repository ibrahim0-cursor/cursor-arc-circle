"use client";

import { Sparkles } from "lucide-react";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";
import { NexusScanActions } from "@/components/nexus/nexus-scan-actions";

export function NexusPremiumHero({
  stableCount,
  feeUsd,
  alphaScanning,
  arcFeePending,
  onAlphaScan,
}: {
  stableCount: number;
  feeUsd: string | number;
  alphaScanning: boolean;
  arcFeePending: boolean;
  onAlphaScan: () => void;
}) {
  return (
    <section className="nexus-premium-hero arc-panel arc-panel-nexus mb-3 overflow-hidden sm:mb-4">
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <ArcIconFrame icon={Sparkles} variant="home" size="md" active className="shrink-0" />
          <div>
            <p className="arc-caption text-violet-300/90">NEXUS · AI trading agent</p>
            <h1 className="text-lg font-bold text-white sm:text-xl">Alpha-first intelligence</h1>
            <p className="mt-1 text-xs text-white/55 sm:text-sm">
              Run Alpha Scan for ranked 2x+ setups · Live feed shows {stableCount} moving alts (not
              WETH/cbBTC) · Arc ~${feeUsd}/tx
            </p>
          </div>
        </div>
        <NexusScanActions
          className="w-full sm:w-auto"
          actions={[
            {
              id: "alpha",
              label: "Alpha Scan",
              icon: Sparkles,
              onClick: onAlphaScan,
              disabled: alphaScanning || arcFeePending,
              loading: alphaScanning,
            },
          ]}
        />
      </div>
    </section>
  );
}
