"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import {
  Bot,
  Brain,
  Database,
  Loader2,
  Radio,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MeshBackground } from "@/components/layout/mesh-background";
import { NexusDecisionCard, NexusTokenDetail } from "@/components/nexus/nexus-decision-card";
import { NexusTokenChart } from "@/components/nexus/nexus-token-chart";
import { ArcSettlementBanner } from "@/components/nexus/arc-settlement-banner";
import { NexusTrendingFeed, type TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { NexusTradeHub } from "@/components/nexus/nexus-demo-trade-panel";
import { NexusPortfolio } from "@/components/nexus/nexus-portfolio";
import { NexusTokenMetrics } from "@/components/nexus/nexus-token-metrics";
import { NexusTokenDetectPanel } from "@/components/nexus/nexus-token-detect-panel";
import { NexusTAPanel } from "@/components/nexus/nexus-ta-panel";
import { NexusIntegrationsBanner } from "@/components/nexus/nexus-integrations-banner";
import { NexusWalletBar } from "@/components/nexus/nexus-wallet-bar";
import { NexusMobileDock, type NexusMobilePanel } from "@/components/nexus/nexus-mobile-dock";
import { NexusTokenStrip } from "@/components/nexus/nexus-token-strip";
import { useToast } from "@/components/ui/toast-provider";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { mergeFeedTokens } from "@/lib/token-security";
import type { NexusDecision } from "@/lib/storage";

const AGENT_MEMORY_KEY = "nexus-agent-memory";
const SAVED_SCANS_KEY = AGENT_MEMORY_KEY;

function persistSavedScans(decisions: NexusDecision[]) {
  try {
    localStorage.setItem(SAVED_SCANS_KEY, JSON.stringify(decisions.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

const LEGACY_SAVED_SCANS_KEY = "nexus-saved-scans";

function readSavedScansCache(): NexusDecision[] {
  try {
    const raw = localStorage.getItem(SAVED_SCANS_KEY);
    if (raw) return JSON.parse(raw) as NexusDecision[];
    const legacy = localStorage.getItem(LEGACY_SAVED_SCANS_KEY);
    if (!legacy) return [];
    const parsed = JSON.parse(legacy) as NexusDecision[];
    persistSavedScans(parsed);
    localStorage.removeItem(LEGACY_SAVED_SCANS_KEY);
    return parsed;
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
  const toast = useToast();
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
  const [activeTab, setActiveTab] = useState<"live" | "saved">("live");
  const [mobilePanel, setMobilePanel] = useState<NexusMobilePanel>("feed");
  const [feedTokens, setFeedTokens] = useState<TrendingMarketToken[]>([]);
  const [heroCompact, setHeroCompact] = useState(true);

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
  const displayDecision =
    activeTab === "saved"
      ? selectedSaved
      : liveDecision ?? (selectedToken ? tokenToDecision(selectedToken) : null);

  useEffect(() => {
    if (activeTab === "saved" && savedDecisions.length > 0 && !selectedSavedId) {
      setSelectedSavedId(savedDecisions[0].id);
    }
  }, [activeTab, savedDecisions, selectedSavedId]);

  const scrollToMobileContent = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById("nexus-mobile-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleMobilePanel = useCallback(
    (panel: NexusMobilePanel) => {
      setMobilePanel(panel);
      scrollToMobileContent();
    },
    [scrollToMobileContent],
  );

  const handleFeedRefresh = useCallback((tokens: TrendingMarketToken[]) => {
    setFeedTokens((prev) => mergeFeedTokens(prev, tokens, 120));
    setSelectedToken((prev) => {
      if (!prev) return tokens[0] ?? null;
      const match = tokens.find(
        (t) =>
          t.tokenAddress.toLowerCase() === prev.tokenAddress.toLowerCase() &&
          t.chainId === prev.chainId,
      );
      if (!match) return prev;
      return {
        ...match,
        security: match.security ?? prev.security,
        intel: { ...match.intel, ...prev.intel },
      };
    });
    setPortfolioKey((k) => k + 1);
  }, []);

  const livePrices = useMemo(() => {
    if (!selectedToken?.tokenAddress || selectedToken.priceUsd <= 0) return {};
    return { [selectedToken.tokenAddress.toLowerCase()]: selectedToken.priceUsd };
  }, [selectedToken?.tokenAddress, selectedToken?.priceUsd]);

  const handleBirdeyeIntel = useCallback((summary: {
    holderCount?: number;
    sniperCount?: number;
    whaleCount?: number;
    insiderCount?: number;
    top10Pct?: number;
  }) => {
    setSelectedToken((prev) => {
      if (!prev) return prev;
      const { top10Pct, ...rest } = summary;
      return {
        ...prev,
        intel: {
          ...prev.intel,
          ...rest,
          top10HolderPercent: top10Pct ?? prev.intel?.top10HolderPercent,
        },
      };
    });
  }, []);

  async function runScan() {
    setScanning(true);
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
      const count = data.count ?? decisions.length;
      setActiveTab("saved");
      setMobilePanel("feed");
      scrollToMobileContent();
      toast({
        type: "success",
        title: "Memory scan complete",
        message: `${count} tokens saved — view in Memory tab`,
      });
      await loadSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed";
      toast({ type: "error", title: "Memory scan failed", message: msg });
    } finally {
      setScanning(false);
    }
  }

  async function runDeepAnalyze() {
    if (!selectedToken) {
      toast({ type: "error", title: "Select a token", message: "Pick a token from Live Feed first" });
      setMobilePanel("feed");
      scrollToMobileContent();
      return;
    }
    if (!isConnected) {
      toast({ type: "error", title: "Connect wallet", message: "Connect on Arc Testnet to run AI analyze" });
      return;
    }
    setLoading(true);
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
      setMobilePanel("chart");
      scrollToMobileContent();
      toast({
        type: "success",
        title: "AI report generated",
        message: `${agent.action} · ${agent.confidence}% confidence — view chart panel`,
      });
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
      const msg = err instanceof Error ? err.message : "Analyze failed";
      toast({ type: "error", title: "AI analyze failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  const feedPanel = (
    <Card className="border-white/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("live");
              setSelectedSavedId(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === "live" ? "bg-cyan-400/15 text-cyan-100" : "text-white/50"
            }`}
          >
            <Radio className="h-4 w-4" />
            Live Feed
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === "saved" ? "bg-cyan-400/15 text-cyan-100" : "text-white/50"
            }`}
          >
            <Database className="h-4 w-4" />
            Memory ({savedDecisions.length})
          </button>
        </div>
      </CardHeader>
      <CardContent className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 lg:max-h-[85vh]">
        {activeTab === "live" ? (
          <NexusTrendingFeed
            selectedAddress={selectedToken?.tokenAddress}
            onSelect={(t) => {
              setSelectedToken(t);
              scrollToMobileContent();
            }}
            onTokensRefresh={handleFeedRefresh}
          />
        ) : savedDecisions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/50">
            <Bot className="mx-auto mb-3 h-8 w-8 text-cyan-300/50" />
            Run <strong className="text-white/70">Memory Scan</strong> to store 20 token analyses on Arc.
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
                setActiveTab("saved");
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
                setMobilePanel("chart");
                scrollToMobileContent();
              }}
            />
          ))
        )}
      </CardContent>
    </Card>
  );

  const chartPanel = (
    <div className="space-y-3">
      <NexusTokenStrip
        tokens={feedTokens}
        selected={selectedToken}
        onSelect={(t) => setSelectedToken(t)}
      />
      {displayDecision && <NexusTokenDetail decision={displayDecision} />}
      <NexusTokenMetrics token={selectedToken} />
      <NexusTokenChart
        chainId={selectedToken?.chainId}
        pairAddress={selectedToken?.pairAddress}
        tokenAddress={selectedToken?.tokenAddress}
        symbol={selectedToken?.symbol}
      />
      <NexusTAPanel technical={displayDecision?.technical ?? selectedToken?.intel?.technical} priceUsd={selectedToken?.priceUsd} />
      <NexusTokenDetectPanel
        chainId={selectedToken?.chainId}
        tokenAddress={selectedToken?.tokenAddress}
        symbol={selectedToken?.symbol}
        txns24h={selectedToken?.txns24h}
        volume24h={selectedToken?.volume24h}
        agentAction={displayDecision?.action}
        onIntelUpdate={handleBirdeyeIntel}
      />
    </div>
  );

  const tradePanel = (
    <div className="space-y-3">
      <NexusTokenStrip
        tokens={feedTokens}
        selected={selectedToken}
        onSelect={(t) => setSelectedToken(t)}
      />
      <NexusTradeHub
        token={selectedToken}
        onTradeComplete={() => setPortfolioKey((k) => k + 1)}
      />
      <NexusPortfolio refreshKey={portfolioKey} livePrices={livePrices} />
    </div>
  );

  return (
    <div className="relative min-h-screen text-white" data-nexus-page>
      <MeshBackground variant="nexus" />

      <div className="relative mx-auto max-w-[1400px] px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:py-10 lg:pb-10">
        <div className="mb-4 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/[0.08] via-blue-500/[0.04] to-transparent p-4 sm:mb-8 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4 sm:gap-6">
            <div className="max-w-2xl flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="nexus">NEXUS AI Agent</Badge>
                <Badge variant="default" className="border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                  RSI · MACD · Whales
                </Badge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl md:text-5xl">Crypto Intelligence</h1>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-cyan-300/80 lg:hidden"
                onClick={() => setHeroCompact((v) => !v)}
              >
                {heroCompact ? "Show details ▾" : "Hide details ▴"}
              </button>
              {!heroCompact && (
                <p className="mt-2 text-sm leading-relaxed text-white/80 sm:mt-3 sm:text-base">
                  Live feed with RSI, MACD, whales, and AI BUY · SELL · HOLD. Arc fees ~${feeUsd}/tx.
                </p>
              )}
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                variant="outline"
                className="min-h-[44px] w-full gap-2 sm:w-auto"
                onClick={runScan}
                disabled={scanning || arcFeePending}
              >
                {scanning || arcFeePending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                Memory Scan
              </Button>
              <Button
                variant="nexus"
                className="min-h-[44px] w-full gap-2 sm:w-auto"
                onClick={runDeepAnalyze}
                disabled={loading || arcFeePending || !selectedToken}
              >
                {loading || arcFeePending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                AI Analyze
              </Button>
            </div>
          </div>

          <div className="mt-4 hidden gap-3 sm:mt-6 sm:grid sm:grid-cols-3">
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

        <div className="mb-4">
          <NexusWalletBar />
        </div>
        <ArcSettlementBanner txHash={lastArcFeeTx ?? undefined} />
        <div className="mb-4">
          <NexusIntegrationsBanner />
        </div>

        <div id="nexus-mobile-content" className="scroll-mt-20 lg:hidden">
          {mobilePanel === "feed" && feedPanel}
          {mobilePanel === "chart" && chartPanel}
          {mobilePanel === "trade" && tradePanel}
        </div>

        <div className="hidden gap-4 lg:grid lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {feedPanel}
          <div className="space-y-3">
            {chartPanel}
            {tradePanel}
          </div>
        </div>

        <NexusMobileDock active={mobilePanel} onChange={handleMobilePanel} />
      </div>
    </div>
  );
}
