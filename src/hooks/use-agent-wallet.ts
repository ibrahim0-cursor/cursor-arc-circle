"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";

const STORAGE_KEY = "nexus-agent-wallet-v2";

export type AgentWallet = {
  address: string;
  source: string;
  configured: boolean;
  balanceUsdc: number;
};

function clearLegacyDemo() {
  try {
    const raw = localStorage.getItem("nexus-agent-wallet-v1");
    if (!raw) return;
    const parsed = JSON.parse(raw) as { address?: string };
    if (parsed.address?.startsWith("0xDemo")) {
      localStorage.removeItem("nexus-agent-wallet-v1");
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function useAgentWallet() {
  const { address: owner } = useAccount();
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBalance = useCallback(async () => {
    if (!owner) {
      setLoading(false);
      return null;
    }

    clearLegacyDemo();
    setLoading(true);
    try {
      const res = await fetch(
        `/api/nexus/agent/vault?owner=${encodeURIComponent(owner)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      const next: AgentWallet = {
        address: data.address ?? "",
        source: data.source ?? "unconfigured",
        configured: Boolean(data.configured && data.address),
        balanceUsdc: Number(data.balanceUsdc ?? 0),
      };
      setWallet(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [owner]);

  const syncDeposits = useCallback(async () => {
    if (!owner) throw new Error("Connect wallet first");
    const res = await fetch("/api/nexus/agent/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, action: "sync" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Sync failed");
    await refreshBalance();
    return data;
  }, [owner, refreshBalance]);

  const creditDepositTx = useCallback(
    async (txHash: string) => {
      if (!owner) throw new Error("Connect wallet first");
      const res = await fetch("/api/nexus/agent/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, action: "credit_tx", txHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not verify deposit");
      await refreshBalance();
      return data;
    },
    [owner, refreshBalance],
  );

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  return {
    wallet,
    loading,
    usdcBalance: wallet?.balanceUsdc ?? 0,
    refreshBalance,
    syncDeposits,
    creditDepositTx,
    ensureWallet: refreshBalance,
  };
}
