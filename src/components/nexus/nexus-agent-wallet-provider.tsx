"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount } from "wagmi";

export type AgentWallet = {
  address: string;
  source: string;
  configured: boolean;
  balanceUsdc: number;
};

type AgentWalletContextValue = {
  wallet: AgentWallet | null;
  loading: boolean;
  usdcBalance: number;
  refreshBalance: () => Promise<AgentWallet | null>;
  syncDeposits: () => Promise<unknown>;
  creditDepositTx: (txHash: string) => Promise<unknown>;
};

const AgentWalletContext = createContext<AgentWalletContextValue | null>(null);

export function NexusAgentWalletProvider({ children }: { children: ReactNode }) {
  const { address: owner } = useAccount();
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const ownerRef = useRef(owner);

  const refreshBalance = useCallback(async () => {
    if (!owner) {
      setWallet(null);
      setLoading(false);
      return null;
    }

    try {
      const res = await fetch(
        `/api/nexus/agent/vault?owner=${encodeURIComponent(owner)}`,
        { cache: "no-store", signal: AbortSignal.timeout(8_000) },
      );
      const data = await res.json();
      const next: AgentWallet = {
        address: data.address ?? "",
        source: data.source ?? "unconfigured",
        configured: Boolean(data.configured && data.address),
        balanceUsdc: Number(data.balanceUsdc ?? 0),
      };
      setWallet(next);
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
      signal: AbortSignal.timeout(12_000),
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
    if (ownerRef.current !== owner) {
      ownerRef.current = owner;
      setLoading(true);
    }
    void refreshBalance();
  }, [owner, refreshBalance]);

  const value = useMemo(
    () => ({
      wallet,
      loading,
      usdcBalance: wallet?.balanceUsdc ?? 0,
      refreshBalance,
      syncDeposits,
      creditDepositTx,
    }),
    [wallet, loading, refreshBalance, syncDeposits, creditDepositTx],
  );

  return <AgentWalletContext.Provider value={value}>{children}</AgentWalletContext.Provider>;
}

const fallback: AgentWalletContextValue = {
  wallet: null,
  loading: false,
  usdcBalance: 0,
  refreshBalance: async () => null,
  syncDeposits: async () => ({}),
  creditDepositTx: async () => ({}),
};

export function useAgentWallet() {
  return useContext(AgentWalletContext) ?? fallback;
}
