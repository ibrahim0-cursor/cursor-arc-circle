"use client";

import { Shield } from "lucide-react";
import { ARC_FEE_USD } from "@/lib/arc-chain";
import { arcExplorerTx } from "@/lib/arc";
import { truncateHash } from "@/lib/utils";

export function ArcSettlementBanner({
  txHash,
  arcBlockNumber,
}: {
  txHash?: string;
  arcBlockNumber?: number;
}) {
  return (
    <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-400/10 to-blue-500/5 p-4">
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-cyan-100">Settled on Arc Testnet · Circle Agora</p>
          <p className="text-white/55">
            All agent fees paid in <strong className="text-white/80">USDC</strong> (~$
            {ARC_FEE_USD.toFixed(2)}/tx) — sub-second finality on Arc.
          </p>
          {txHash && (
            <a
              href={arcExplorerTx(txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-cyan-300 hover:underline"
            >
              Arc tx {truncateHash(txHash)} {arcBlockNumber ? `· block ${arcBlockNumber}` : ""}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
