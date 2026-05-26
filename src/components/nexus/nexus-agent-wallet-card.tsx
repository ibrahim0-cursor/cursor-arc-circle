"use client";

import { Copy, ExternalLink, Loader2, Wallet } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { useAgentWallet } from "@/hooks/use-agent-wallet";
import { arcExplorerAddress } from "@/lib/arc";

export function NexusAgentWalletCard({
  requiredUsdc,
  compact = false,
}: {
  requiredUsdc: number;
  compact?: boolean;
}) {
  const toast = useToast();
  const { wallet, loading, usdcBalance, refreshBalance } = useAgentWallet();
  const ready = usdcBalance >= requiredUsdc;

  async function copyAddress() {
    if (!wallet?.address) return;
    await navigator.clipboard.writeText(wallet.address);
    toast({ type: "success", title: "Copied", message: "Agent deposit address copied" });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading agent wallet…
      </div>
    );
  }

  if (!wallet) {
    return (
      <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
        Agent wallet unavailable — connect wallet and refresh.
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        ready ? "border-emerald-400/30 bg-emerald-500/10" : "border-amber-400/30 bg-amber-500/10"
      }`}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Wallet className="h-4 w-4 text-cyan-200" />
        Agent vault · {usdcBalance.toFixed(2)} USDC
      </p>
      <p className="mt-1 text-xs text-white/60">
        {ready
          ? `Funded · ~$${requiredUsdc.toFixed(2)} needed per scheduled buy`
          : `Send at least ~$${requiredUsdc.toFixed(2)} USDC on Arc Testnet to this address before Run`}
      </p>
      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded-lg bg-black/40 px-2 py-1 text-[10px] text-cyan-100/90">
            {wallet.address}
          </code>
          <button
            type="button"
            onClick={() => void copyAddress()}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/15 px-2.5 text-xs font-bold text-white/80"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <a
            href={arcExplorerAddress(wallet.address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-cyan-400/30 px-2.5 text-xs font-bold text-cyan-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Explorer
          </a>
          <button
            type="button"
            onClick={() => void refreshBalance()}
            className="text-xs font-medium text-violet-200/80 underline"
          >
            Refresh balance
          </button>
        </div>
      )}
      {wallet.demo && (
        <p className="mt-1.5 text-[10px] text-white/45">Demo agent wallet — sandbox balance shown when Circle is configured.</p>
      )}
    </div>
  );
}
