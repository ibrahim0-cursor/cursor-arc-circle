"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useBalance, useChainId, useDisconnect } from "wagmi";
import { ChevronDown, LogOut, Wallet } from "lucide-react";
import { ARC_TESTNET_ID } from "@/lib/arc-chain";
import { truncateHash } from "@/lib/utils";
import { WalletConnectButton } from "@/components/nexus/wallet-connect-button";
import { NexusWalletScoreButton } from "@/components/nexus/nexus-wallet-score";
import { cn } from "@/lib/utils";

/** Compact wallet control for the site header on NEXUS. */
export function NexusWalletMenu() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address, chainId: ARC_TESTNET_ID });
  const onArc = chainId === ARC_TESTNET_ID;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!isConnected) {
    return <WalletConnectButton compact />;
  }

  const bal = balance ? `${Number(balance.formatted).toFixed(2)} USDC` : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "arc-btn-pill flex min-h-[40px] items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
          onArc
            ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-50"
            : "border-amber-400/35 bg-amber-500/10 text-amber-100",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Wallet className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{truncateHash(address!, 4, 4)}</span>
        {bal && <span className="rounded-md bg-black/35 px-2 py-0.5 text-xs font-bold">{bal}</span>}
        <ChevronDown className={cn("h-4 w-4 opacity-60 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[min(280px,calc(100vw-2rem))] rounded-2xl border border-emerald-400/25 bg-[#080d14] p-3 shadow-2xl"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
            {onArc ? "Arc Testnet" : "Switch to Arc Testnet"}
          </p>
          <p className="mt-1 font-mono text-xs text-white/70">{truncateHash(address!, 8, 6)}</p>
          {bal && <p className="mt-2 text-sm font-bold text-emerald-200">{bal}</p>}

          <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
            <div className="flex flex-wrap gap-2">
              <NexusWalletScoreButton />
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
