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
import { NexusTokenDetail } from "@/components/nexus/nexus-decision-card";
import { NexusDeepResearchPanel } from "@/components/nexus/nexus-deep-research";
import { NexusMemoryList } from "@/components/nexus/nexus-memory-list";
import { NexusAbSwap } from "@/components/nexus/nexus-ab-swap";
import { filterTradableTokens } from "@/lib/token-filters";
import type { NexusResearchReport } from "@/lib/nexus-research";
import { NexusTokenChart } from "@/components/nexus/nexus-token-chart";
import { ArcSettlementBanner } from "@/components/nexus/arc-settlement-banner";
import { NexusTrendingFeed, type TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { NexusAgentWalletProvider } from "@/components/nexus/nexus-agent-wallet-provider";
import { NexusTradeHub } from "@/components/nexus/nexus-demo-trade-panel";
import { NexusPortfolio } from "@/components/nexus/nexus-portfolio";
import { NexusTokenMetrics } from "@/components/nexus/nexus-token-metrics";
import { NexusTokenDetectPanel } from "@/components/nexus/nexus-token-detect-panel";
import { NexusTAPanel } from "@/components/nexus/nexus-ta-panel";
import { NexusIntegrationsBanner } from "@/components/nexus/nexus-integrations-banner";
import { NexusWalletBar } from "@/components/nexus/nexus-wallet-bar";
import { NexusMobileDock, type NexusMobilePanel } from "@/components/nexus/nexus-mobile-dock";
import { NexusMobileContextBar } from "@/components/nexus/nexus-mobile-context-bar";
import { useIsMobile } from "@/hooks/use-is-mobile";
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
  const [tradeTab, setTradeTab] = useState<"buy" | "sell" | "agent">("buy");
  const [actionBanner, setActionBanner] = useState<{
    title: string;
    message: string;
    type: "success" | "info";
  } | null>(null);
  const [feedTokens, setFeedTokens] = useState<TrendingMarketToken[]>([]);
  const [heroCompact, setHeroCompact] = useState(true);
  const [deepResearch, setDeepResearch] = useState<NexusResearchReport | null>(null);
  const isMobile = useIsMobile();

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
    const tradable = filterTradableTokens(tokens);
    setFeedTokens((prev) => mergeFeedTokens(prev, tradable, 120));
    setSelectedToken((prev) => {
      if (!prev) return tradable[0] ?? null;
      const match = tradable.find(
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
    const map: Record<string, number> = {};
    for (const t of feedTokens) {
      if (t.tokenAddress && t.priceUsd > 0) map[t.tokenAddress.toLowerCase()] = t.priceUsd;
    }
    if (selectedToken?.tokenAddress && selectedToken.priceUsd > 0) {
      map[selectedToken.tokenAddress.toLowerCase()] = selectedToken.priceUsd;
    }
    return map;
  }, [feedTokens, selectedToken?.tokenAddress, selectedToken?.priceUsd]);

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
      if (decisions.length === 0 && !data.error) {
        throw new Error("Scan returned 0 tokens — try again in a few seconds");
      }
      const merged = decisions.length ? decisions : readSavedScansCache();
      setSavedDecisions(merged);
      persistSavedScans(merged);
      if (merged[0]) setSelectedSavedId(merged[0].id);
      const count = data.count ?? decisions.length;
      setActiveTab("saved");
      setMobilePanel("feed");
      scrollToMobileContent();
      setActionBanner({
        type: "success",
        title: "Memory scan complete",
        message: `${count} tokens scanned (DexScreener + Birdeye + scam check). Rugs flagged SELL — open Memory.`,
      });
      toast({
        type: "success",
        title: "Memory scan complete",
        message: `${count} tokens saved — Memory tab`,
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
      if (data.research) setDeepResearch(data.research as NexusResearchReport);
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
      setActionBanner({
        type: "success",
        title: "Deep Research ready",
        message: "Thesis, risks, catalysts & levels — chart panel (not just BUY/SELL/HOLD).",
      });
      toast({
        type: "success",
        title: "Deep Research",
        message: "Open chart panel for thesis, risks & news",
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
      <CardContent className="flex max-lg:max-h-[calc(100dvh-14rem)] max-lg:min-h-0 flex-col overflow-hidden p-3 lg:min-h-[min(85vh,920px)]">
        {activeTab === "live" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-0 flex-1 overflow-hidden">
              <NexusTrendingFeed
                selectedAddress={selectedToken?.tokenAddress}
                onSelect={(t) => {
                  setSelectedToken(t);
                  setDeepResearch(null);
                  if (isMobile) {
                    setMobilePanel("chart");
                  }
                  scrollToMobileContent();
                }}
                onTokensRefresh={handleFeedRefresh}
                onOpenTrade={(tab) => {
                  setTradeTab(tab);
                  setMobilePanel("trade");
                  scrollToMobileContent();
                }}
              />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <NexusMemoryList
              decisions={savedDecisions}
              selectedId={selectedSavedId}
              onSelect={(decision) => {
                setActiveTab("saved");
                setSelectedSavedId(decision.id);
                setDeepResearch(null);
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
                    reasoningFactors: decision.reasoningFactors ?? [],
                  },
                });
                setMobilePanel("chart");
                scrollToMobileContent();
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const chartPanel = !selectedToken ? (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-12 text-center lg:py-16">
      <p className="text-sm text-white/55">Select a token from the feed to view chart &amp; analysis.</p>
    </div>
  ) : (
    <div className="space-y-3 max-lg:pb-2">
      <div className="hidden lg:block">
        <NexusTokenStrip tokens={feedTokens} selected={selectedToken} onSelect={(t) => setSelectedToken(t)} />
      </div>
      <NexusTokenMetrics token={selectedToken} />
      <NexusTokenChart
        chainId={selectedToken.chainId}
        pairAddress={selectedToken.pairAddress}
        tokenAddress={selectedToken.tokenAddress}
        symbol={selectedToken.symbol}
      />
      <NexusTAPanel
        technical={displayDecision?.technical ?? selectedToken.intel?.technical}
        priceUsd={selectedToken.priceUsd}
        defaultOpen={!isMobile}
      />
      <NexusTokenDetectPanel
        chainId={selectedToken.chainId}
        tokenAddress={selectedToken.tokenAddress}
        symbol={selectedToken.symbol}
        txns24h={selectedToken.txns24h}
        volume24h={selectedToken.volume24h}
        agentAction={displayDecision?.action}
        onIntelUpdate={handleBirdeyeIntel}
      />
      {deepResearch && (
        <NexusDeepResearchPanel report={deepResearch} onClose={() => setDeepResearch(null)} />
      )}
      {displayDecision && !deepResearch && <NexusTokenDetail decision={displayDecision} />}
    </div>
  );

  const tradePanel = (
    <div className="space-y-3 max-lg:pb-4">
      <div className="hidden lg:block">
        <NexusTokenStrip tokens={feedTokens} selected={selectedToken} onSelect={(t) => setSelectedToken(t)} />
      </div>
      <NexusTradeHub
        token={selectedToken}
        activeTab={tradeTab}
        onTabChange={setTradeTab}
        onTradeComplete={() => setPortfolioKey((k) => k + 1)}
      />
      <NexusPortfolio refreshKey={portfolioKey} livePrices={livePrices} />
      <NexusAbSwap tokens={feedTokens} onComplete={() => setPortfolioKey((k) => k + 1)} />
    </div>
  );

  return (
    <NexusAgentWalletProvider>
    <div className="relative min-h-screen text-white" data-nexus-page data-nexus-easy-mode>
      <MeshBackground variant="nexus" />

      <div className="relative mx-auto max-w-[1400px] px-4 py-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:py-8 lg:pb-8">
        <div className="mb-3 hidden overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/[0.08] via-blue-500/[0.04] to-transparent p-4 sm:mb-8 sm:block sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4 sm:gap-6">
            <div className="max-w-2xl flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="nexus">NEXUS AI Agent</Badge>
                <Badge variant="default" className="border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                  RSI · MACD · Whales
                </Badge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl md:text-5xl">Crypto Intelligence</h1>
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
                title="Arc fee · archives ~20 tokens with whale/holder snapshot + journal"
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
                title="Thesis, risks, catalysts & levels for selected token (chart panel) — not the same as feed BUY/SELL"
                onClick={runDeepAnalyze}
                disabled={loading || arcFeePending || !selectedToken}
              >
                {loading || arcFeePending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                Deep Research
              </Button>
              <span className="hidden text-[10px] text-white/40 xl:inline" title="Thesis, risks, news — not just BUY/SELL">
                ≠ feed signal
              </span>
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

        <NexusMobileContextBar
          selectedToken={selectedToken}
          activePanel={mobilePanel}
          onPanelChange={(p) => {
            setMobilePanel(p);
            scrollToMobileContent();
          }}
          onScan={() => void runScan()}
          onResearch={() => void runDeepAnalyze()}
          scanning={scanning}
          researching={loading}
        />

        <div className="mb-3 max-lg:mb-2">
          <div className="lg:hidden">
            <NexusWalletBar compact />
          </div>
          <div className="hidden lg:block">
            <NexusWalletBar />
          </div>
        </div>
        <ArcSettlementBanner txHash={lastArcFeeTx ?? undefined} />
        {actionBanner && (
          <div
            className={`mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${
              actionBanner.type === "success"
                ? "border-emerald-400/35 bg-emerald-500/10"
                : "border-cyan-400/35 bg-cyan-500/10"
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-white">{actionBanner.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">{actionBanner.message}</p>
            </div>
            <button
              type="button"
              className="text-xs text-white/50 underline"
              onClick={() => setActionBanner(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="mb-4">
          <NexusIntegrationsBanner />
        </div>

        <div id="nexus-mobile-content" className="nexus-mobile-panel scroll-mt-36 lg:hidden">
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
    </NexusAgentWalletProvider>
  );
}
