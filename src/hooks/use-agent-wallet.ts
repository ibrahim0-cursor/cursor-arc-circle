"use client";

import { useCallback, useEffect, useState } from "react";
import { useBalance } from "wagmi";
import { ARC_TESTNET_ID } from "@/lib/arc-chain";

const STORAGE_KEY = "nexus-agent-wallet-v1";

export type AgentWallet = {
  walletId: string;
  address: string;
  demo: boolean;
};

function readStored(): AgentWallet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AgentWallet;
  } catch {
    return null;
  }
}

function writeStored(wallet: AgentWallet) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}

export function useAgentWallet() {
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [apiBalance, setApiBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: onChainBalance } = useBalance({
    address: wallet?.address as `0x${string}` | undefined,
    chainId: ARC_TESTNET_ID,
    query: { enabled: Boolean(wallet?.address && !wallet.address.startsWith("0xDemo")) },
  });

  const refreshBalance = useCallback(async (w: AgentWallet) => {
    try {
      const res = await fetch(
        `/api/circle/wallet?walletId=${encodeURIComponent(w.walletId)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      const list = data.balances ?? [];
      const usdc = list.find(
        (b: { currency?: string }) => (b.currency ?? "").toUpperCase() === "USDC",
      );
      if (usdc?.amount != null) {
        setApiBalance(Number(usdc.amount));
        return;
      }
    } catch {
      /* fallback to on-chain */
    }
    setApiBalance(null);
  }, []);

  const ensureWallet = useCallback(async () => {
    const stored = readStored();
    if (stored) {
      setWallet(stored);
      await refreshBalance(stored);
      setLoading(false);
      return stored;
    }

    const res = await fetch("/api/circle/wallet", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.address) {
      setLoading(false);
      return null;
    }

    const next: AgentWallet = {
      walletId: data.walletId ?? `demo-${Date.now()}`,
      address: data.address,
      demo: Boolean(data.demo),
    };
    writeStored(next);
    setWallet(next);
    await refreshBalance(next);
    setLoading(false);
    return next;
  }, [refreshBalance]);

  useEffect(() => {
    void ensureWallet();
  }, [ensureWallet]);

  const usdcBalance =
    apiBalance ??
    (onChainBalance ? Number(onChainBalance.formatted) : wallet?.demo ? 0 : 0);

  return {
    wallet,
    loading,
    usdcBalance,
    refreshBalance: () => (wallet ? refreshBalance(wallet) : Promise.resolve()),
    ensureWallet,
  };
}
