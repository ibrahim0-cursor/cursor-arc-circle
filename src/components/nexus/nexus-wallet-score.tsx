"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ARC_TESTNET_ID } from "@/lib/arc-chain";
import type { WalletScore } from "@/lib/wallet-score";

export function NexusWalletScoreButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [score, setScore] = useState<WalletScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function loadScore() {
    if (!address) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        address,
        onArc: String(chainId === ARC_TESTNET_ID),
      });
      const res = await fetch(`/api/nexus/wallet/score?${params}`);
      const data = await res.json();
      if (res.ok) {
        setScore(data);
        setOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isConnected && address) loadScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainId]);

  if (!isConnected) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Shield className="h-4 w-4" />
        Wallet Score
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={loadScore} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
        Wallet Score {score ? `· ${score.grade}` : ""}
      </Button>

      {open && score && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-white/15 bg-[#0a0a12] p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="font-medium">{score.label}</p>
            <span className="text-2xl font-bold text-cyan-300">{score.grade}</span>
          </div>
          <p className="mt-1 text-sm text-white/55">Score {score.score}/100</p>
          <div className="mt-3 space-y-2">
            {score.factors.map((f) => (
              <div key={f.label} className="flex justify-between text-xs text-white/60">
                <span>{f.label}</span>
                <span className={f.impact >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {f.impact >= 0 ? "+" : ""}
                  {f.impact}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 text-xs text-white/40 hover:text-white/60"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export function WalletScoreChip({ score }: { score: WalletScore }) {
  const color =
    score.grade === "A" || score.grade === "B"
      ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
      : score.grade === "C"
        ? "text-amber-200 border-amber-400/30 bg-amber-400/10"
        : "text-rose-300 border-rose-400/30 bg-rose-400/10";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${color}`}>
      {score.grade} · {score.score}
    </span>
  );
}
