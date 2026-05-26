"use client";

import { useAccount, useBalance, useChainId } from "wagmi";
import { ExternalLink, Wallet } from "lucide-react";
import { WalletConnectButton } from "@/components/nexus/wallet-connect-button";
import { NexusWalletScoreButton } from "@/components/nexus/nexus-wallet-score";
import { ARC_TESTNET_ID, arcExplorerAddress } from "@/lib/arc-chain";
import { truncateHash } from "@/lib/utils";

export function NexusWalletBar() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address, chainId: ARC_TESTNET_ID });
  const onArc = chainId === ARC_TESTNET_ID;

  return (
    <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 to-violet-500/5 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15">
              <Wallet className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Arc Wallet</p>
              <p className="text-xs text-white/55">
                {isConnected
                  ? onArc
                    ? "Connected · Arc Testnet"
                    : "Connected · switch to Arc to trade"
                  : "Connect to trade & run the agent"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WalletConnectButton compact />
          <NexusWalletScoreButton />
        </div>

        {isConnected && address && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href={arcExplorerAddress(address)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/25 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:border-cyan-400/30 hover:text-cyan-100 sm:flex-none"
            >
              <ExternalLink className="h-4 w-4 text-cyan-300" />
              View on Arc Explorer · {truncateHash(address, 8, 6)}
            </a>
            {balance && (
              <div className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-100">
                Balance {Number(balance.formatted).toFixed(2)} {balance.symbol}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
