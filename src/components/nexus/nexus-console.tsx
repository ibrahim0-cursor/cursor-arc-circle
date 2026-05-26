"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { WalletConnectButton } from "@/components/nexus/wallet-connect-button";
import { Bot, CheckCircle2, Loader2, Play, RefreshCw, Sparkles, Zap } from "lucide-react";
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
import { NexusTAPanel } from "@/components/nexus/nexus-ta-panel";
import { NexusWalletScoreButton } from "@/components/nexus/nexus-wallet-score";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import type { NexusDecision } from "@/lib/storage";

const SAVED_SCANS_KEY = "nexus-saved-scans";

function persistSavedScans(decisions: NexusDecision[]) {
  try {
    localStorage.setItem(SAVED_SCANS_KEY, JSON.stringify(decisions.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

function readSavedScansCache(): NexusDecision[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_SCANS_KEY) ?? "[]") as NexusDecision[];
  } catch {
    return [];
  }
}

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
    technical: token.intel?.technical,
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
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "saved">("live");

  const loadSaved = useCallback(async () => {
    const res = await fetch(`/api/nexus/decisions?t=${Date.now()}`);
    const data = (await res.json()) as NexusDecision[];
    if (data.length > 0) {
      setSavedDecisions(data);
      persistSavedScans(data);
      return;
    }
    const cached = readSavedScansCache();
    if (cached.length > 0) setSavedDecisions(cached);
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const liveDecision = selectedToken ? tokenToDecision(selectedToken) : null;
  const selectedSaved = savedDecisions.find((d) => d.id === selectedSavedId) ?? null;
  const displayDecision = activeTab === "saved" && selectedSaved ? selectedSaved : liveDecision;

  const handleFeedRefresh = useCallback((tokens: TrendingMarketToken[]) => {
    setSelectedToken((prev) => {
      if (!prev) return prev;
      const updated = tokens.find(
        (t) =>
          t.tokenAddress.toLowerCase() === prev.tokenAddress.toLowerCase() &&
          t.chainId === prev.chainId,
      );
      if (!updated) return prev;
      return {
        ...updated,
        intel: {
          ...updated.intel,
          holderCount: prev.intel?.holderCount ?? updated.intel?.holderCount,
          sniperCount: prev.intel?.sniperCount ?? updated.intel?.sniperCount,
          whaleCount: prev.intel?.whaleCount ?? updated.intel?.whaleCount,
          insiderCount: prev.intel?.insiderCount ?? updated.intel?.insiderCount,
          top10HolderPercent: prev.intel?.top10HolderPercent ?? updated.intel?.top10HolderPercent,
        },
      };
    });
    setPortfolioKey((k) => k + 1);
  }, []);

  const livePrices = useMemo(() => {
    if (!selectedToken?.tokenAddress || selectedToken.priceUsd <= 0) return {};
    return { [selectedToken.tokenAddress.toLowerCase()]: selectedToken.priceUsd };
  }, [selectedToken?.tokenAddress, selectedToken?.priceUsd]);

  useEffect(() => {
    if (!selectedToken?.chainId || !selectedToken?.tokenAddress) return;
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams({
        chainId: selectedToken.chainId,
        address: selectedToken.tokenAddress,
        buys: String(selectedToken.txns24h?.buys ?? 0),
        sells: String(selectedToken.txns24h?.sells ?? 0),
        volume: String(selectedToken.volume24h ?? 0),
      });
      const res = await fetch(`/api/nexus/token/detect?${params}&t=${Date.now()}`);
      const data = await res.json();
      if (cancelled || !res.ok || !data.summary?.birdeyeLive) return;

      setSelectedToken((prev) => {
        if (
          !prev ||
          prev.tokenAddress.toLowerCase() !== selectedToken.tokenAddress.toLowerCase()
        ) {
          return prev;
        }
        return {
          ...prev,
          intel: {
            ...prev.intel,
            holderCount: data.summary.holderCount,
            sniperCount: data.summary.sniperCount,
            whaleCount: data.summary.whaleCount,
            insiderCount: data.summary.insiderCount,
            top10HolderPercent: data.summary.top10Pct,
          },
        };
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedToken?.chainId, selectedToken?.tokenAddress, selectedToken?.txns24h?.buys, selectedToken?.txns24h?.sells, selectedToken?.volume24h]);

  async function runScan() {
    setScanning(true);
    setScanError(null);
    setSuccessMsg(null);
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

      const decisions = (data.decisions ?? []) as NexusDecision[];
      const merged = decisions.length ? decisions : readSavedScansCache();
      setSavedDecisions(merged);
      persistSavedScans(merged);
      if (merged[0]) setSelectedSavedId(merged[0].id);
      setSuccessMsg(`Deep scan saved ${data.count ?? decisions.length} tokens with RSI/MACD + whale intel on Arc`);
      setActiveTab("saved");
      await loadSaved();
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
    setSuccessMsg(null);
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
          save: true,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analyze failed");

      const agent = data.agent ?? data;
      setSelectedToken((prev) =>
        prev
          ? {
              ...prev,
              agent: {
                action: agent.action,
                confidence: agent.confidence,
                riskScore: agent.riskScore,
                reasoning: agent.reasoning,
                whyAction: agent.whyAction,
                reasoningFactors: agent.reasoningFactors ?? [],
              },
              intel: { ...prev.intel, ...data.intel, technical: data.technical ?? data.intel?.technical },
            }
          : prev,
      );
      setSuccessMsg(data.message ?? `AI Analyze: ${agent.action} · saved to Arc`);
      if (data.saved && data.agent) {
        const saved = data.agent as NexusDecision;
        setSavedDecisions((prev) => {
          const next = [saved, ...prev.filter((d) => d.id !== saved.id)].slice(0, 50);
          persistSavedScans(next);
          return next;
        });
      }
      await loadSaved();
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
                  RSI · MACD · Whales
                </Badge>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Full Crypto Intelligence</h1>
              <p className="mt-3 text-white/60">
                Live feed with <strong className="text-white">RSI, MACD, trend lines</strong>, sniper/whale/insider
                detection, and AI <strong className="text-white">BUY · SELL · HOLD</strong> signals. Arc USDC fees (~$
                {feeUsd}/tx).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <WalletConnectButton />
              <NexusWalletScoreButton />
              <Button variant="outline" onClick={runScan} disabled={scanning || arcFeePending}>
                {scanning || arcFeePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Deep Scan (20)
              </Button>
              <Button variant="nexus" onClick={runDeepAnalyze} disabled={loading || arcFeePending || !selectedToken}>
                {loading || arcFeePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                AI Analyze
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, label: "20 tokens · 45s refresh", sub: "DexScreener live like the real feed" },
              { icon: Bot, label: "TA + AI reasoning", sub: "RSI · MACD · trend · whale risk" },
              { icon: Sparkles, label: "Wallet score", sub: "Grade every wallet A–F" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
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

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}
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
                  Live Feed
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("saved")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "saved" ? "bg-cyan-400/15 text-cyan-100" : "text-white/50"}`}
                >
                  Saved Scans ({savedDecisions.length})
                </button>
              </div>
            </CardHeader>
            <CardContent className="max-h-[85vh] space-y-4 overflow-y-auto pr-1">
              {activeTab === "live" ? (
                <NexusTrendingFeed
                  selectedAddress={selectedToken?.tokenAddress}
                  onSelect={setSelectedToken}
                  onTokensRefresh={handleFeedRefresh}
                />
              ) : savedDecisions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/50">
                  <Bot className="mx-auto mb-3 h-8 w-8 text-cyan-300/50" />
                  Run <strong className="text-white/70">Deep Scan (20)</strong> to save full analysis on Arc.
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
                    selected={selectedSavedId === decision.id}
                    onSelect={() => {
                      setSelectedSavedId(decision.id);
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
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <NexusTokenChart chainId={selectedToken?.chainId} pairAddress={selectedToken?.pairAddress} />
            {displayDecision && <NexusTokenDetail decision={displayDecision} />}
            <NexusTAPanel technical={displayDecision?.technical ?? selectedToken?.intel?.technical} priceUsd={selectedToken?.priceUsd} />
            <NexusTokenDetectPanel
              chainId={selectedToken?.chainId}
              tokenAddress={selectedToken?.tokenAddress}
              symbol={selectedToken?.symbol}
              txns24h={selectedToken?.txns24h}
              volume24h={selectedToken?.volume24h}
            />
            <NexusDemoTradePanel token={selectedToken} onTradeComplete={() => setPortfolioKey((k) => k + 1)} />
            <NexusPortfolio refreshKey={portfolioKey} livePrices={livePrices} />
          </div>
        </div>
      </div>
    </div>
  );
}
