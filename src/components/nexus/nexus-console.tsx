"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { WalletConnectButton } from "@/components/nexus/wallet-connect-button";
import { Bot, Loader2, Play, RefreshCw, Sparkles, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MeshBackground } from "@/components/layout/mesh-background";
import { NexusDecisionCard, NexusTokenDetail } from "@/components/nexus/nexus-decision-card";
import { NexusTokenChart } from "@/components/nexus/nexus-token-chart";
import { NexusSwapPanel } from "@/components/nexus/nexus-swap-panel";
import { SWAP_CRITERIA, chainIdFromWallet } from "@/lib/swappable";
import type { NexusDecision } from "@/lib/storage";

export function NexusConsole() {
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const walletChain = chainIdFromWallet(walletChainId);

  const [decisions, setDecisions] = useState<NexusDecision[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/nexus/decisions");
    const data = (await res.json()) as NexusDecision[];
    const swappable = data.filter((d) => d.swappable !== false);
    setDecisions(swappable);
    if (swappable.length && !selectedId) setSelectedId(swappable[0].id);
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = decisions.find((d) => d.id === selectedId) ?? decisions[0] ?? null;

  async function runScan() {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch("/api/nexus/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletChainId: isConnected ? walletChainId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      await load();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function runDecision() {
    setLoading(true);
    setScanError(null);
    try {
      const res = await fetch("/api/nexus/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletChainId: isConnected ? walletChainId : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Decision failed");
      }
      await load();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen text-white">
      <MeshBackground variant="nexus" />

      <div className="relative mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-10">
        {/* Hero header */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/[0.08] via-blue-500/[0.04] to-transparent p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="nexus">NEXUS v2</Badge>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live markets
                </span>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Autonomous Trading Intelligence
              </h1>
              <p className="mt-3 text-white/60">
                Only tokens you can <strong className="text-white">buy & sell from your wallet</strong> via 0x —
                EVM chains with real liquidity.
                <span className="mt-1 block text-cyan-300/80">
                  {isConnected && walletChain
                    ? `Scanning ${walletChain} for wallet-swappable pairs`
                    : "Connect wallet to scan your chain · Base · Ethereum · Arbitrum"}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <WalletConnectButton />
              <Button variant="outline" onClick={runScan} disabled={scanning}>
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Scan
              </Button>
              <Button variant="nexus" onClick={runDecision} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run Agent
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, label: "DexScreener + Birdeye", sub: "Live token intel" },
              { icon: Bot, label: "AI reasoning", sub: "Why BUY / SELL / HOLD" },
              { icon: Sparkles, label: "Wallet + Swap", sub: "Execute on-chain" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <item.icon className="h-5 w-5 text-cyan-300" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-white/45">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-white/45">
            <CriteriaPill label={`Liquidity ≥ $${SWAP_CRITERIA.minLiquidityUsd / 1000}K`} />
            <CriteriaPill label={`Volume ≥ $${SWAP_CRITERIA.minVolume24h / 1000}K`} />
            <CriteriaPill label="EVM contract only" />
            <CriteriaPill label="0x swap routable" />
          </div>
        </div>

        {scanError && (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {scanError}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Left: decision feed */}
          <Card className="border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Agent feed</h2>
                <Badge variant="nexus">{decisions.length} signals</Badge>
              </div>
            </CardHeader>
            <CardContent className="max-h-[85vh] space-y-4 overflow-y-auto pr-1">
              {decisions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/50">
                  <Wallet className="mx-auto mb-3 h-8 w-8 text-cyan-300/50" />
                  Connect wallet and tap <strong className="text-white/70">Scan</strong> to load tokens
                  you can buy or sell directly.
                </div>
              ) : (
                decisions.map((decision) => (
                  <NexusDecisionCard
                    key={decision.id}
                    decision={{
                      ...decision,
                      chainId: decision.chainId ?? "unknown",
                      whyAction: decision.whyAction ?? decision.reasoning,
                      reasoningFactors: decision.reasoningFactors ?? [],
                      intel: decision.intel ?? {},
                    }}
                    selected={selected?.id === decision.id}
                    onSelect={() => setSelectedId(decision.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Right: chart + detail + swap */}
          <div className="space-y-6">
            <NexusTokenChart
              chainId={selected?.chainId}
              pairAddress={selected?.pairAddress}
            />
            <NexusTokenDetail decision={selected} />
            <NexusSwapPanel decision={selected} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CriteriaPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 uppercase tracking-wider">
      {label}
    </span>
  );
}
