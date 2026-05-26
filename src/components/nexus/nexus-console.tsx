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
import { NexusTokenDetectPanel } from "@/components/nexus/nexus-token-detect-panel";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { isArcChain } from "@/lib/arc-chain";
import type { NexusDecision } from "@/lib/storage";

function tokenToDecision(token: TrendingMarketToken): NexusDecision | null {
  if (!token.agent) return null;
  return {
    id: `${token.chainId}:${token.tokenAddress}`,
    timestamp: token.updatedAt ?? new Date().toISOString(),
    token: token.tokenAddress,
    symbol: token.symbol,
    name: token.name,
    chainId: token.chainId,
    pairAddress: token.pairAddress,
    dexUrl: token.url,
    icon: token.icon,
    priceUsd: token.priceUsd,
    change24h: token.change24h,
    volume24h: token.volume24h,
    liquidityUsd: token.liquidityUsd,
    intel: token.intel ?? {},
    swappable: true,
    ...token.agent,
  };
}

export function NexusConsole() {
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const { payArcFee, ensureArcNetwork, isPending: arcFeePending, feeUsd } = useArcSettlement();
  const [lastArcFeeTx, setLastArcFeeTx] = useState<string | null>(null);
  const [portfolioKey, setPortfolioKey] = useState(0);

  const [savedDecisions, setSavedDecisions] = useState<NexusDecision[]>([]);
  const [selectedToken, setSelectedToken] = useState<TrendingMarketToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "saved">("live");

  const loadSaved = useCallback(async () => {
    const res = await fetch("/api/nexus/decisions");
    const data = (await res.json()) as NexusDecision[];
    setSavedDecisions(data.filter((d) => d.swappable !== false));
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const liveDecision = selectedToken ? tokenToDecision(selectedToken) : null;
  const chartToken = selectedToken;
  const tradeToken = selectedToken;

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
        body: JSON.stringify({ walletChainId, arcFeeTxHash: fee.txHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      await loadSaved();
      setActiveTab("saved");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function runDeepAnalyze() {
    if (!selectedToken || !isConnected) return;
    setLoading(true);
    setScanError(null);
    try {
      await ensureArcNetwork();
      const fee = await payArcFee("ANALYZE", selectedToken.tokenAddress);
      setLastArcFeeTx(fee.txHash);

      const res = await fetch("/api/nexus/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: selectedToken.chainId,
          tokenAddress: selectedToken.tokenAddress,
          deep: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analyze failed");

      setSelectedToken((prev) =>
        prev
          ? {
              ...prev,
              agent: data.agent,
              intel: data.intel ?? prev.intel,
            }
          : prev,
      );
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Analyze failed");
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
                <Badge variant="nexus">NEXUS AI Agent</Badge>
                <Badge variant="default" className="border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                  <FlaskConical className="mr-1 h-3 w-3" />
                  Live · 45s refresh
                </Badge>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  BUY · SELL · HOLD signals
                </span>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                AI Trading on Arc
              </h1>
              <p className="mt-3 text-white/60">
                NEXUS agent scans <strong className="text-white">DexScreener + Birdeye</strong>, signals which tokens
                to buy, sell, or hold — with sniper & whale detection. Settle in{" "}
                <strong className="text-white">Arc USDC</strong> (~${feeUsd}/tx).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <WalletConnectButton />
              <Button variant="outline" onClick={runScan} disabled={scanning || arcFeePending}>
                {scanning || arcFeePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Deep Scan
              </Button>
              <Button
                variant="nexus"
                onClick={runDeepAnalyze}
                disabled={loading || arcFeePending || !selectedToken}
              >
                {loading || arcFeePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                AI Analyze
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, label: "Live token feed", sub: "Updates every 45s like DexScreener" },
              { icon: Bot, label: "AI agent signals", sub: "BUY · SELL · HOLD + reasoning" },
              { icon: Sparkles, label: "Detect snipers & whales", sub: "Live txs · holder intel" },
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
        </div>

        <ArcSettlementBanner txHash={lastArcFeeTx ?? undefined} />

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
                  onClick={() => setActiveTab("live")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "live" ? "bg-cyan-400/15 text-cyan-100" : "text-white/50"}`}
                >
                  Live Agent Feed
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("saved")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "saved" ? "bg-cyan-400/15 text-cyan-100" : "text-white/50"}`}
                >
                  Saved Scans
                </button>
                <Badge variant="nexus" className="ml-auto">
                  {activeTab === "live" ? "Auto-refresh" : `${savedDecisions.length} saved`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="max-h-[85vh] space-y-4 overflow-y-auto pr-1">
              {activeTab === "live" ? (
                <NexusTrendingFeed
                  selectedAddress={selectedToken?.tokenAddress}
                  onSelect={setSelectedToken}
                />
              ) : savedDecisions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/50">
                  <Bot className="mx-auto mb-3 h-8 w-8 text-cyan-300/50" />
                  Run <strong className="text-white/70">Deep Scan</strong> to save anchored decisions on Arc.
                </div>
              ) : (
                savedDecisions.map((decision) => (
                  <NexusDecisionCard
                    key={decision.id}
                    decision={{
                      ...decision,
                      chainId: decision.chainId ?? "unknown",
                      whyAction: decision.whyAction ?? decision.reasoning,
                      reasoningFactors: decision.reasoningFactors ?? [],
                      intel: decision.intel ?? {},
                    }}
                    selected={false}
                    onSelect={() => {
                      setSelectedToken({
                        symbol: decision.symbol,
                        name: decision.name ?? decision.symbol,
                        tokenAddress: decision.token,
                        chainId: decision.chainId,
                        pairAddress: decision.pairAddress ?? "",
                        priceUsd: decision.priceUsd,
                        change24h: decision.change24h,
                        volume24h: decision.volume24h ?? 0,
                        liquidityUsd: decision.liquidityUsd ?? 0,
                        icon: decision.icon,
                        url: decision.dexUrl ?? "",
                        intel: decision.intel,
                        agent: {
                          action: decision.action,
                          confidence: decision.confidence,
                          riskScore: decision.riskScore,
                          reasoning: decision.reasoning,
                          whyAction: decision.whyAction,
                          reasoningFactors: decision.reasoningFactors,
                        },
                      });
                      setActiveTab("live");
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
            {liveDecision && <NexusTokenDetail decision={liveDecision} />}
            <NexusTokenDetectPanel
              chainId={selectedToken?.chainId}
              tokenAddress={selectedToken?.tokenAddress}
              symbol={selectedToken?.symbol}
              txns24h={selectedToken?.txns24h}
              volume24h={selectedToken?.volume24h}
            />
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
