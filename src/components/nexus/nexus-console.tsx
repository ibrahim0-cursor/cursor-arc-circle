"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { WalletConnectButton } from "@/components/nexus/wallet-connect-button";
import { Bot, FlaskConical, Loader2, Play, RefreshCw, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MeshBackground } from "@/components/layout/mesh-background";
import { NexusDecisionCard, NexusTokenDetail } from "@/components/nexus/nexus-decision-card";
import { NexusTokenChart } from "@/components/nexus/nexus-token-chart";
import { ArcSettlementBanner } from "@/components/nexus/arc-settlement-banner";
import { NexusTrendingFeed, type TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { NexusDemoTradePanel } from "@/components/nexus/nexus-demo-trade-panel";
import { NexusPortfolio } from "@/components/nexus/nexus-portfolio";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { isArcChain } from "@/lib/arc-chain";
import { SWAP_CRITERIA, chainIdFromWallet } from "@/lib/swappable";
import type { NexusDecision } from "@/lib/storage";

export function NexusConsole() {
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const walletChain = chainIdFromWallet(walletChainId);
  const { payArcFee, ensureArcNetwork, isPending: arcFeePending, feeUsd } = useArcSettlement();
  const [lastArcFeeTx, setLastArcFeeTx] = useState<string | null>(null);
  const [portfolioKey, setPortfolioKey] = useState(0);

  const [decisions, setDecisions] = useState<NexusDecision[]>([]);
  const [selectedToken, setSelectedToken] = useState<TrendingMarketToken | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"trending" | "agent">("trending");

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

  const selectedDecision = decisions.find((d) => d.id === selectedId) ?? decisions[0] ?? null;
  const chartToken = selectedToken ?? selectedDecision;
  const tradeToken = selectedToken ?? selectedDecision;

  async function runScan() {
    setScanning(true);
    setScanError(null);
    try {
      if (!isConnected) throw new Error("Connect wallet on Arc Testnet to scan");
      await ensureArcNetwork();
      const fee = await payArcFee("SCAN", `scan-${Date.now()}`);
      setLastArcFeeTx(fee.txHash);

      const res = await fetch("/api/nexus/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletChainId: isConnected ? walletChainId : undefined,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      await load();
      setActiveTab("agent");
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
      if (!isConnected) throw new Error("Connect wallet on Arc Testnet");
      await ensureArcNetwork();
      const fee = await payArcFee("DECIDE", `decide-${Date.now()}`);
      setLastArcFeeTx(fee.txHash);

      const res = await fetch("/api/nexus/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletChainId: isConnected ? walletChainId : undefined,
          arcFeeTxHash: fee.txHash,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Decision failed");
      }
      await load();
      setActiveTab("agent");
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
        <div className="mb-8 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/[0.08] via-blue-500/[0.04] to-transparent p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="nexus">NEXUS Demo</Badge>
                <Badge variant="default" className="border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                  <FlaskConical className="mr-1 h-3 w-3" />
                  Testnet trading
                </Badge>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  DexScreener + Birdeye live
                </span>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Demo Trading on Arc
              </h1>
              <p className="mt-3 text-white/60">
                Trending tokens from <strong className="text-white">DexScreener & Birdeye</strong> — buy, sell, and
                swap to <strong className="text-white">Arc USDC</strong> on testnet (~${feeUsd}/tx).
                <span className="mt-1 block text-cyan-300/80">
                  {isConnected && isArcChain(walletChainId)
                    ? "Arc Testnet · demo trade on Arc / Sepolia / Base / Arbitrum testnets"
                    : "Connect MetaMask on Arc Testnet to start demo trading"}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <WalletConnectButton />
              <Button variant="outline" onClick={runScan} disabled={scanning || arcFeePending}>
                {scanning || arcFeePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Agent Scan
              </Button>
              <Button variant="nexus" onClick={runDecision} disabled={loading || arcFeePending}>
                {loading || arcFeePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run Agent
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, label: "Live trending feed", sub: "DexScreener + Birdeye intel" },
              { icon: FlaskConical, label: "Testnet demo trades", sub: "Arc · Sepolia · Base · Arb" },
              { icon: Sparkles, label: "Settle in Arc USDC", sub: "Fees + swap back to USDC" },
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
            <CriteriaPill label="Testnet only" />
            <CriteriaPill label="Fees in Arc USDC" />
            <CriteriaPill label="Circle × Agora" />
            <CriteriaPill label={`Live mcap from Birdeye`} />
          </div>
        </div>

        <ArcSettlementBanner
          txHash={lastArcFeeTx ?? selectedDecision?.arcTxHash}
          arcBlockNumber={selectedDecision?.arcBlockNumber}
        />

        {scanError && (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {scanError}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <Card className="border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("trending")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "trending" ? "bg-cyan-400/15 text-cyan-100" : "text-white/50"}`}
                >
                  Trending
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("agent")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "agent" ? "bg-cyan-400/15 text-cyan-100" : "text-white/50"}`}
                >
                  Agent feed
                </button>
                <Badge variant="nexus" className="ml-auto">
                  {activeTab === "trending" ? "Live market" : `${decisions.length} signals`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="max-h-[85vh] space-y-4 overflow-y-auto pr-1">
              {activeTab === "trending" ? (
                <NexusTrendingFeed
                  selectedAddress={selectedToken?.tokenAddress}
                  onSelect={(token) => {
                    setSelectedToken(token);
                    setSelectedId(null);
                  }}
                />
              ) : decisions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/50">
                  <Bot className="mx-auto mb-3 h-8 w-8 text-cyan-300/50" />
                  Run <strong className="text-white/70">Agent Scan</strong> for AI signals, or use Trending tab to demo trade now.
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
                    selected={selectedDecision?.id === decision.id}
                    onSelect={() => {
                      setSelectedId(decision.id);
                      setSelectedToken(null);
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <NexusTokenChart
              chainId={chartToken?.chainId}
              pairAddress={chartToken?.pairAddress}
            />
            {selectedDecision && !selectedToken && (
              <NexusTokenDetail decision={selectedDecision} />
            )}
            <NexusDemoTradePanel
              token={tradeToken}
              onTradeComplete={() => setPortfolioKey((k) => k + 1)}
            />
            <NexusPortfolio refreshKey={portfolioKey} />
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
