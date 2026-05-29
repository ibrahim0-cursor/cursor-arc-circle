import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArcBackground } from "@/components/layout/arc-background";
import { ArcCounterPanel } from "@/components/arc/arc-counter-panel";

export const metadata = {
  title: "Arc On-Chain · MERIDIAN",
  description: "Deploy and interact with the Counter contract on Arc Testnet",
};

export default function ArcPage() {
  return (
    <div className="relative min-h-screen overflow-hidden text-white" data-arc-theme="home">
      <ArcBackground theme="home" />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/50 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/70">
          Arc Testnet · Foundry
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          On-chain Counter
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          This is the official Arc tutorial contract, integrated into MERIDIAN. After you deploy with
          Foundry, the app reads the live counter and lets any connected wallet call{" "}
          <code className="text-emerald-200/80">increment()</code> — gas paid in USDC on Arc.
        </p>
        <div className="mt-8 space-y-6">
          <ArcCounterPanel />
          <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-sm text-white/55">
            <p className="font-semibold text-white/80">What you get in the app</p>
            <ul className="mt-3 list-inside list-disc space-y-2 leading-relaxed">
              <li>Live <strong className="text-white/75">number()</strong> from your deployed contract</li>
              <li>
                <strong className="text-white/75">Increment</strong> button — real Arc tx from the user wallet
              </li>
              <li>Links to ArcScan for contract and transactions</li>
              <li>
                Separate from PRISM/NEXUS fee anchors — those stay as-is; this is a proof-of-deploy demo
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
