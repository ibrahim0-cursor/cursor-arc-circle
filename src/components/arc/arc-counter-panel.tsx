"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Box, ExternalLink, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import {
  ARC_COUNTER_ABI,
  arcCounterChain,
  getArcCounterAddress,
} from "@/lib/arc-counter-contract";
import { arcExplorerAddress, arcExplorerTx } from "@/lib/arc-chain";
import { truncateHash } from "@/lib/utils";

export function ArcCounterPanel() {
  const address = getArcCounterAddress();
  const { address: wallet, isConnected } = useAccount();
  const { ensureArcNetwork, onArc } = useArcSettlement();
  const [error, setError] = useState<string | null>(null);

  const { data: number, refetch, isLoading: reading } = useReadContract({
    address,
    abi: ARC_COUNTER_ABI,
    functionName: "number",
    chainId: arcCounterChain.id,
    query: { enabled: Boolean(address) },
  });

  const { writeContract, data: txHash, isPending: writing } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: arcCounterChain.id,
  });

  useEffect(() => {
    if (isSuccess) void refetch();
  }, [isSuccess, refetch]);

  const increment = useCallback(async () => {
    if (!address) return;
    setError(null);
    try {
      await ensureArcNetwork();
      writeContract({
        address,
        abi: ARC_COUNTER_ABI,
        functionName: "increment",
        chainId: arcCounterChain.id,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    }
  }, [address, ensureArcNetwork, writeContract]);

  if (!address) {
    return (
      <div className="arc-glass-card rounded-2xl border border-white/10 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <Box className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400/90" />
          <div>
            <h2 className="text-lg font-semibold text-white">Arc Counter contract</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Foundry scaffold lives in <code className="text-emerald-200/90">contracts/</code>. Deploy
              Counter to Arc Testnet, then set{" "}
              <code className="text-emerald-200/90">NEXT_PUBLIC_ARC_COUNTER_ADDRESS</code> in Vercel to
              enable read/increment from this page.
            </p>
            <p className="mt-3 text-xs text-white/45">
              See <code>contracts/README.md</code> for{" "}
              <code className="text-white/55">forge script … --broadcast</code> steps.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="arc-glass-card rounded-2xl border border-emerald-400/20 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300/80">
            On-chain · Arc Testnet
          </p>
          <h2 className="mt-1 text-2xl font-bold tabular-nums text-white">
            {reading ? "…" : String(number ?? 0)}
          </h2>
          <p className="mt-1 text-sm text-white/55">Counter.number()</p>
        </div>
        <a
          href={arcExplorerAddress(address)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-emerald-200/80 underline-offset-2 hover:underline"
        >
          Contract <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          variant="nexus"
          className="arc-btn-pill gap-2"
          disabled={!isConnected || writing || confirming}
          onClick={() => void increment()}
        >
          {(writing || confirming) && <Loader2 className="h-4 w-4 animate-spin" />}
          <Plus className="h-4 w-4" />
          Increment on Arc
        </Button>
        {!isConnected && (
          <span className="text-xs text-white/50">Connect wallet (top right) on Arc Testnet</span>
        )}
        {isConnected && !onArc && (
          <span className="text-xs text-amber-200/80">Switch to Arc Testnet to transact</span>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-rose-300/90">{error}</p>}
      {txHash && (
        <p className="mt-3 text-xs text-white/50">
          Tx{" "}
          <a
            href={arcExplorerTx(txHash)}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-200/90 underline"
          >
            {truncateHash(txHash, 10, 8)}
          </a>
          {confirming ? " · confirming…" : isSuccess ? " · confirmed" : ""}
        </p>
      )}
      {isSuccess && (
        <p className="mt-2 text-xs text-emerald-200/80">
          Counter updated on Arc
          {wallet ? ` · ${truncateHash(wallet, 6, 4)}` : ""}
        </p>
      )}
    </div>
  );
}
