import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArcBackground } from "@/components/layout/arc-background";
import { ArcCounterPanel } from "@/components/arc/arc-counter-panel";
import { getArcCounterAddress } from "@/lib/arc-counter-contract";

export const metadata = {
  title: "Arc On-Chain · MERIDIAN",
  description: "Live Counter contract on Arc Testnet",
};

export default function ArcPage() {
  const configured = Boolean(getArcCounterAddress());

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
          Arc Testnet
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          On-chain Counter
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          {configured
            ? "MERIDIAN is connected to your deployed Counter on Arc. Read the value or increment from any connected wallet (USDC gas)."
            : "Deploy the Arc tutorial Counter once, then set NEXT_PUBLIC_ARC_COUNTER_ADDRESS on Vercel."}
        </p>
        <div className="mt-8">
          <ArcCounterPanel />
        </div>
      </div>
    </div>
  );
}
