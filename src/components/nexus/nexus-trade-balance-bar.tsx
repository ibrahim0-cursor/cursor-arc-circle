"use client";

import { Coins, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { ARC_TESTNET_ID } from "@/lib/arc-chain";
import { useAgentWallet } from "@/hooks/use-agent-wallet";
import { formatUsd } from "@/lib/utils";
import type { DemoPosition } from "@/lib/storage";

export function NexusTradeBalanceBar({
  symbol,
  position,
  showAgentVault = false,
}: {
  symbol?: string;
  position?: DemoPosition | null;
  showAgentVault?: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: ARC_TESTNET_ID });
  const { wallet: agentWallet, usdcBalance: agentUsdc, loading: agentLoading } = useAgentWallet();

  const walletUsdc = balance ? Number(balance.formatted) : 0;

  if (!isConnected) {
    return (
      <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
        Connect wallet on Arc Testnet to trade.
      </p>
    );
  }

  return (
    <div className={`grid gap-2 ${showAgentVault ? "sm:grid-cols-2" : ""}`}>
      <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200/80">
          <Wallet className="h-3.5 w-3.5" />
          Your wallet (fees)
        </p>
        <p className="mt-1 text-lg font-bold text-white">{walletUsdc.toFixed(2)} USDC</p>
      </div>
      {showAgentVault && (
        <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200/80">
            <Coins className="h-3.5 w-3.5" />
            Agent vault (trades)
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {agentLoading ? "…" : `${agentUsdc.toFixed(2)} USDC`}
          </p>
          {agentWallet?.address && (
            <p className="mt-0.5 truncate text-[9px] text-white/40">{agentWallet.address}</p>
          )}
        </div>
      )}
      {position && position.tokenAmount > 0 && symbol && (
        <div className="col-span-full rounded-xl border border-white/10 bg-black/25 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/45">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
            Holding {symbol}
          </p>
          <p className="text-sm font-semibold text-white">
            {position.tokenAmount.toFixed(4)} {symbol} · spent {formatUsd(position.usdcSpent)}
          </p>
        </div>
      )}
    </div>
  );
}
