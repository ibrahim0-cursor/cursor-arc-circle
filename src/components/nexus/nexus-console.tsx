"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { ArrowDownUp, Database, LineChart, Loader2, Radio, Sparkles, Wallet } from "lucide-react";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { ArcBackground } from "@/components/layout/arc-background";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";
import { ArcPanel } from "@/components/ui/arc-panel";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { NexusPremiumHero } from "@/components/nexus/nexus-premium-hero";
import { NexusTokenDetail } from "@/components/nexus/nexus-decision-card";
import { NexusDeepResearchPanel } from "@/components/nexus/nexus-deep-research";
import { NexusSocialIntelPanel } from "@/components/nexus/nexus-social-intel";
import { CommunityPulsePanel } from "@/components/shared/community-pulse-panel";
import type { CommunityPulse } from "@/lib/community-pulse";
import { NexusMemoryList } from "@/components/nexus/nexus-memory-list";
import { NexusAlphaList } from "@/components/nexus/nexus-alpha-list";
import type { AlphaOpportunity } from "@/lib/nexus-agent";
import { STABLE_FEED_LIMIT, ALPHA_SCAN_LIMIT, MEMORY_SCAN_LIMIT } from "@/lib/feed-config";
import { NexusAbSwap } from "@/components/nexus/nexus-ab-swap";
import { filterTradableTokens } from "@/lib/token-filters";
import type { NexusResearchReport } from "@/lib/nexus-research";
import type { TokenSocialIntel } from "@/lib/social-intel";
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
import { NexusMobileTokenActions } from "@/components/nexus/nexus-mobile-token-actions";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { NexusTokenStrip } from "@/components/nexus/nexus-token-strip";
import { NexusCenterTokenHeader } from "@/components/nexus/nexus-center-token-header";
import { NexusTokenChatButton } from "@/components/nexus/nexus-token-chat";
import { useToast } from "@/components/ui/toast-provider";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { mergeFeedTokensStable } from "@/lib/token-security";
import type { NexusDecision } from "@/lib/storage";
import { cn } from "@/lib/utils";

const AGENT_MEMORY_KEY = "nexus-agent-memory";
const SAVED_SCANS_KEY = AGENT_MEMORY_KEY;

function persistSavedScans(decisions: NexusDecision[]) {
  try {
    localStorage.setItem(SAVED_SCANS_KEY, JSON.stringify(decisions.slice(0, 20)));
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
  const [memoryScanCount, setMemoryScanCount] = useState<number | null>(null);
  const [selectedToken, setSelectedToken] = useState<TrendingMarketToken | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [alphaScanning, setAlphaScanning] = useState(false);
  const [alphaScanError, setAlphaScanError] = useState<string | null>(null);
  const [alphaOpportunities, setAlphaOpportunities] = useState<AlphaOpportunity[]>([]);
  const [activeTab, setActiveTab] = useState<"live" | "saved" | "alpha">("live");
  const [mobilePanel, setMobilePanel] = useState<NexusMobilePanel>("feed");
  const [tradeTab, setTradeTab] = useState<"buy" | "sell" | "agent">("buy");
  const [actionBanner, setActionBanner] = useState<{
    title: string;
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);
  const [feedTokens, setFeedTokens] = useState<TrendingMarketToken[]>([]);
  const [deepResearch, setDeepResearch] = useState<NexusResearchReport | null>(null);
  const [socialIntel, setSocialIntel] = useState<TokenSocialIntel | null>(null);
  const [communityPulse, setCommunityPulse] = useState<CommunityPulse | null>(null);
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

  const openChartView = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobilePanel("chart");
      scrollToMobileContent();
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById("nexus-chart-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [scrollToMobileContent]);

  const openTradePanel = useCallback(
    (tab: "buy" | "sell" | "agent") => {
      setTradeTab(tab);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
        setMobilePanel("trade");
        scrollToMobileContent();
        return;
      }
      requestAnimationFrame(() => {
        document.getElementById("nexus-trade-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },
    [scrollToMobileContent],
  );

  const handleTokenSelect = useCallback(
    (token: TrendingMarketToken, openChart = true) => {
      setSelectedToken(token);
      setDeepResearch(null);
      setSocialIntel(null);
      if (openChart) openChartView();
    },
    [openChartView],
  );

  const handleMobilePanel = useCallback(
    (panel: NexusMobilePanel) => {
      setMobilePanel(panel);
      scrollToMobileContent();
    },
    [scrollToMobileContent],
  );

  const handleFeedRefresh = useCallback((tokens: TrendingMarketToken[]) => {
    const tradable = filterTradableTokens(tokens);
    setFeedTokens((prev) => mergeFeedTokensStable(prev, tradable, STABLE_FEED_LIMIT));
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

  async function payOptionalArcFee(action: string, payload: string): Promise<string | undefined> {
    try {
      await ensureArcNetwork();
      const fee = await payArcFee(action, payload);
      setLastArcFeeTx(fee.txHash);
      return fee.txHash;
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "").toLowerCase();
      if (
        msg.includes("reject") ||
        msg.includes("denied") ||
        msg.includes("cancel") ||
        msg.includes("insufficient") ||
        msg.includes("failed on-chain")
      ) {
        toast({
          type: "info",
          title: "Arc fee skipped",
          message: "Scan continues without on-chain fee — use Arc testnet for full settlement.",
          durationMs: 10_000,
        });
        return undefined;
      }
      throw err;
    }
  }

  async function runMemoryScan() {
    setScanning(true);
    try {
      if (!isConnected) throw new Error("Connect wallet on Arc Testnet to scan");
      const arcFeeTxHash = await payOptionalArcFee("SCAN", `memory-${Date.now()}`);

      const res = await fetch("/api/nexus/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "memory", walletChainId, arcFeeTxHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");

      const decisions = (data.decisions ?? []) as NexusDecision[];
      if (decisions.length === 0 && !data.error) {
        throw new Error("Scan returned 0 tokens — try again in a few seconds");
      }
      const merged = [...decisions, ...readSavedScansCache()].slice(0, 20);
      setSavedDecisions(merged);
      persistSavedScans(merged);
      if (merged[0]) setSelectedSavedId(merged[0].id);
      const count = data.count ?? decisions.length;
      setMemoryScanCount(count);
      setActiveTab("saved");
      setMobilePanel("feed");
      scrollToMobileContent();
      setActionBanner({
        type: "success",
        title: "Memory scan complete",
        message: `${count} tokens archived with full intel — open Memory tab.`,
      });
      toast({
        type: "success",
        title: "Memory scan complete",
        message: `${count} tokens saved (max ${MEMORY_SCAN_LIMIT})`,
      });
      await loadSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed";
      toast({ type: "error", title: "Memory scan failed", message: msg, durationMs: 12_000 });
    } finally {
      setScanning(false);
    }
  }

  async function runAlphaScan() {
    setAlphaScanning(true);
    setAlphaScanError(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 110_000);
    try {
      if (!isConnected) throw new Error("Connect wallet on Arc Testnet to scan");
      const arcFeeTxHash = await payOptionalArcFee("ALPHA", `alpha-${Date.now()}`);

      const res = await fetch("/api/nexus/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "alpha",
          walletChainId,
          arcFeeTxHash,
          chainId: selectedToken?.chainId,
          tokenAddress: selectedToken?.tokenAddress,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        const hint = typeof data.hint === "string" ? ` ${data.hint}` : "";
        throw new Error(`${data.error ?? "Alpha scan failed"}${hint}`);
      }

      const rows = (data.opportunities ?? []) as AlphaOpportunity[];
      if (rows.length === 0) throw new Error("Alpha scan returned 0 tokens");

      setAlphaOpportunities(rows);
      setActiveTab("alpha");
      setMobilePanel("feed");
      scrollToMobileContent();
      const topBuy = rows.find((r) => r.action === "BUY");
      setActionBanner({
        type: "success",
        title: "Alpha scan complete",
        message: `${rows.length} opportunities ranked${topBuy ? ` · top: ${topBuy.symbol} BUY` : ""}`,
      });
      toast({
        type: "success",
        title: "Alpha scan complete",
        message: `${rows.length} tokens — 6-layer alpha + AI thesis`,
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "AbortError"
          ? "Alpha scan timed out (~110s). Server may still be busy — wait and retry."
          : err instanceof Error
            ? err.message
            : "Alpha scan failed";
      setAlphaScanError(msg);
      setActionBanner({
        type: "error",
        title: "Alpha scan failed",
        message: msg,
      });
      toast({
        type: "error",
        title: "Alpha scan failed",
        message: msg,
        durationMs: 15_000,
      });
    } finally {
      window.clearTimeout(timer);
      setAlphaScanning(false);
    }
  }

  function selectAlphaRow(row: AlphaOpportunity) {
    handleTokenSelect(
      {
        symbol: row.symbol,
        name: row.name,
        tokenAddress: row.tokenAddress,
        chainId: row.chainId,
        pairAddress: "",
        priceUsd: row.priceUsd,
        change24h: row.change24h,
        volume24h: row.volume24h,
        liquidityUsd: row.liquidityUsd,
        url: "",
        agent: {
          action: row.action,
          confidence: row.confidence,
          riskScore: row.riskScore,
          reasoning: row.aiThesis || row.reasoning,
          whyAction: row.whyAction,
          reasoningFactors: [],
        },
      },
      true,
    );
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
      if (data.social) setSocialIntel(data.social as TokenSocialIntel);
      if (data.community) setCommunityPulse(data.community as CommunityPulse);
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
    <NexusCollapsible
      label="Market feed"
      hint="Live · Saved · Alpha"
      icon={Radio}
      variant="reasoning"
      defaultOpen
      showCollapseHint
      className="nexus-column-panel nexus-feed-panel max-lg:!border-0 max-lg:!bg-transparent lg:flex lg:h-full lg:max-h-full lg:min-h-0 lg:flex-col"
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5 max-lg:mb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("live");
            setSelectedSavedId(null);
          }}
          className={cn(
            "arc-btn-pill flex items-center gap-1.5 px-3 py-2 text-sm font-medium",
            activeTab === "live" ? "arc-nav-pill-active text-emerald-50" : "text-white/50",
          )}
        >
          <ArcIconBadge icon={Radio} theme="nexus" size="sm" className="!h-7 !w-7" />
          Live Feed
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={cn(
            "arc-btn-pill flex items-center gap-1.5 px-3 py-2 text-sm font-medium",
            activeTab === "saved" ? "arc-nav-pill-active text-emerald-50" : "text-white/50",
          )}
        >
          <ArcIconBadge icon={Database} theme="nexus" size="sm" className="!h-7 !w-7" />
          Saved scans
          {memoryScanCount != null ? (
            <span className="rounded-md bg-emerald-500/20 px-1.5 text-[10px] font-bold text-emerald-200">
              {memoryScanCount}
            </span>
          ) : savedDecisions.length > 0 ? (
            <span className="text-[10px] font-normal text-white/40">({savedDecisions.length} archived)</span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("alpha")}
          className={cn(
            "arc-btn-pill flex items-center gap-1.5 px-3 py-2 text-sm font-medium",
            activeTab === "alpha"
              ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
              : "text-white/50",
          )}
        >
          <ArcIconBadge icon={Sparkles} theme="home" size="sm" className="!h-7 !w-7" />
          Alpha ({alphaOpportunities.length})
        </button>
      </div>
      {activeTab === "saved" && savedDecisions.length > 0 && memoryScanCount == null && (
        <p className="arc-caption mb-2 text-white/45">
          Past scans from your wallet — run <strong className="text-emerald-200/90">Memory Scan</strong> to refresh.
        </p>
      )}
      <div className="flex min-h-0 flex-1 flex-col max-lg:h-[calc(100dvh-12.5rem)] max-lg:min-h-[320px] lg:min-h-0">
        {activeTab === "live" ? (
          <NexusTrendingFeed
            className="h-full min-h-0"
            cleanFeed
            selectedAddress={selectedToken?.tokenAddress}
            onSelect={(t, opts) => handleTokenSelect(t, opts?.openChart ?? true)}
            onTokensRefresh={handleFeedRefresh}
            onOpenTrade={(tab) => {
              setTradeTab(tab);
              setMobilePanel("trade");
              scrollToMobileContent();
            }}
          />
        ) : activeTab === "alpha" ? (
          <div className="nexus-feed-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <NexusAlphaList
              opportunities={alphaOpportunities}
              selectedAddress={selectedToken?.tokenAddress}
              onSelect={selectAlphaRow}
              scanning={alphaScanning}
              scanError={alphaScanError}
            />
          </div>
        ) : (
          <div className="nexus-feed-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <NexusMemoryList
              decisions={savedDecisions}
              selectedId={selectedSavedId}
              onSelect={(decision) => {
                setActiveTab("saved");
                setSelectedSavedId(decision.id);
                setDeepResearch(null);
                setSocialIntel(null);
                handleTokenSelect(
                  {
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
                  },
                  true,
                );
              }}
            />
          </div>
        )}
      </div>
    </NexusCollapsible>
  );

  const chartPanel = !selectedToken ? (
    <div className="arc-signal-panel arc-signal-panel-nexus flex flex-col items-center justify-center gap-3 px-4 py-12 text-center lg:py-16">
      <ArcIconFrame icon={LineChart} variant="nexus" size="md" />
      <p className="text-sm text-white/55">Select a token from the feed to view chart &amp; analysis.</p>
    </div>
  ) : (
    <div className="nexus-center-layout flex min-h-0 flex-1 flex-col max-lg:space-y-3 max-lg:pb-4 lg:overflow-hidden">
      <div className="nexus-center-toolbar shrink-0 space-y-2.5 lg:space-y-3 lg:border-b lg:border-white/[0.06] lg:pb-3">
        <NexusCenterTokenHeader
          token={selectedToken}
          decision={displayDecision}
          actions={
            <>
              <NexusTokenChatButton token={selectedToken} onOpenTrade={openTradePanel} />
              <button
                type="button"
                onClick={() => openTradePanel("buy")}
                className="arc-glass-interactive hidden min-h-[40px] rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 text-xs font-bold text-emerald-100 lg:inline-flex lg:items-center"
              >
                Buy →
              </button>
              <button
                type="button"
                onClick={() => openTradePanel("sell")}
                className="arc-glass-interactive hidden min-h-[40px] rounded-xl border border-rose-400/35 bg-rose-500/15 px-3 text-xs font-bold text-rose-100 lg:inline-flex lg:items-center"
              >
                Sell →
              </button>
            </>
          }
        />
        <NexusTokenStrip
          tokens={feedTokens}
          selected={selectedToken}
          onSelect={(t) => handleTokenSelect(t)}
          mobileLimit={STABLE_FEED_LIMIT}
          compact
        />
        <NexusMobileTokenActions token={selectedToken} onTradeTab={openTradePanel} />
        <NexusTokenMetrics token={selectedToken} compact />
      </div>

      <div className="nexus-center-chart shrink-0 py-1 lg:py-2">
        <NexusTokenChart
          chainId={selectedToken.chainId}
          pairAddress={selectedToken.pairAddress}
          tokenAddress={selectedToken.tokenAddress}
          symbol={selectedToken.symbol}
        />
      </div>

      <div className="nexus-center-intel min-h-0 flex-1 space-y-3 lg:overflow-y-auto lg:overscroll-contain lg:pr-1 lg:pt-1">
        <p className="arc-caption hidden px-1 text-white/40 lg:block">Intel &amp; analysis — expand any section below</p>
        <NexusTAPanel
          technical={displayDecision?.technical ?? selectedToken.intel?.technical}
          priceUsd={selectedToken.priceUsd}
          defaultOpen={false}
          showCollapseHint
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
        {communityPulse && communityPulse.items.length > 0 && (
          <ArcPanel theme="nexus" title={`Community · ${communityPulse.topic}`} icon={Radio}>
            <CommunityPulsePanel pulse={communityPulse} compact />
          </ArcPanel>
        )}
        {socialIntel && <NexusSocialIntelPanel social={socialIntel} />}
        {displayDecision && !deepResearch && (
          <NexusCollapsible
            label="Agent decision"
            hint={`${displayDecision.action} · ${displayDecision.confidence}% confidence`}
            variant="reasoning"
            icon={Sparkles}
            defaultOpen={false}
            showCollapseHint
          >
            <NexusTokenDetail decision={displayDecision} />
          </NexusCollapsible>
        )}
      </div>
    </div>
  );

  const tradePanel = (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="shrink-0 space-y-3 max-lg:pb-2">
        <div className="lg:hidden">
          <NexusTokenStrip
            tokens={feedTokens}
            selected={selectedToken}
            onSelect={(t) => handleTokenSelect(t)}
            mobileLimit={STABLE_FEED_LIMIT}
          />
          {selectedToken && (
            <NexusMobileTokenActions
              token={selectedToken}
              onTradeTab={(tab) => setTradeTab(tab)}
            />
          )}
        </div>
        <NexusCollapsible
          label="Arc Trade · Agent"
          hint="Buy · Sell · Autopilot"
          icon={ArrowDownUp}
          variant="reasoning"
          defaultOpen
          showCollapseHint
        >
          <NexusTradeHub
            embedded
            token={selectedToken}
            activeTab={tradeTab}
            onTabChange={setTradeTab}
            onTradeComplete={() => setPortfolioKey((k) => k + 1)}
          />
        </NexusCollapsible>
      </div>
      <div className="nexus-trade-column-scroll min-h-0 flex-1 space-y-3 max-lg:pb-4">
        <NexusCollapsible
          label="Portfolio & swap"
          hint="Balances · A/B swap"
          icon={Wallet}
          variant="intel"
          defaultOpen
          showCollapseHint
        >
          <NexusPortfolio refreshKey={portfolioKey} livePrices={livePrices} />
          <NexusAbSwap tokens={feedTokens} onComplete={() => setPortfolioKey((k) => k + 1)} />
        </NexusCollapsible>
      </div>
    </div>
  );

  return (
    <NexusAgentWalletProvider>
    <div className="relative min-h-screen text-white" data-nexus-page data-nexus-easy-mode data-arc-theme="nexus">
      <ArcBackground theme="nexus" />

      <div className="relative mx-auto w-full max-w-[1920px] px-3 py-2 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-4 lg:py-8 lg:pb-8 xl:px-6">
        <NexusPremiumHero
          stableCount={STABLE_FEED_LIMIT}
          feeUsd={feeUsd}
          scanning={scanning}
          alphaScanning={alphaScanning}
          researching={loading}
          arcFeePending={arcFeePending}
          hasSelectedToken={!!selectedToken}
          onMemoryScan={() => void runMemoryScan()}
          onAlphaScan={() => void runAlphaScan()}
          onDeepResearch={() => void runDeepAnalyze()}
        />

        <NexusMobileContextBar
          selectedToken={selectedToken}
          activePanel={mobilePanel}
          onPanelChange={(p) => {
            setMobilePanel(p);
            scrollToMobileContent();
          }}
          onMemoryScan={() => void runMemoryScan()}
          onAlphaScan={() => void runAlphaScan()}
          onResearch={() => void runDeepAnalyze()}
          scanning={scanning}
          alphaScanning={alphaScanning}
          researching={loading}
          arcFeePending={arcFeePending}
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
            className={cn(
              "arc-glass-card mb-4 flex flex-wrap items-start justify-between gap-3 px-4 py-3",
              actionBanner.type === "success" && "arc-glass-card-nexus border-emerald-400/35",
              actionBanner.type === "error" && "border-rose-400/35 bg-rose-500/10",
              actionBanner.type === "info" && "arc-glass-card-nexus",
            )}
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
        <div className="mb-3 max-lg:hidden">
          <NexusIntegrationsBanner />
        </div>

        <div id="nexus-mobile-content" className="nexus-mobile-panel scroll-mt-36 max-lg:min-h-0 lg:hidden">
          {mobilePanel === "feed" && feedPanel}
          {mobilePanel === "chart" && chartPanel}
          {mobilePanel === "trade" && tradePanel}
        </div>

        <div
          className="hidden items-stretch gap-4 lg:grid lg:gap-5 xl:gap-6"
          data-nexus-layout="desktop"
        >
          <div className="flex min-h-0 max-h-[calc(100vh-7rem)] min-w-0 flex-col overflow-hidden lg:sticky lg:top-20">
            {feedPanel}
          </div>
          <div
            id="nexus-chart-panel"
            className="nexus-center-panel nexus-column-panel arc-panel arc-panel-nexus flex min-h-0 max-h-[calc(100vh-7rem)] min-w-0 flex-col scroll-mt-24 lg:sticky lg:top-20"
          >
            <div className="arc-panel-stripe arc-panel-stripe-nexus" />
            <div className="shrink-0 border-b border-white/[0.06] px-4 py-2.5">
              <p className="arc-caption text-violet-300/80">Token intelligence</p>
              <p className="text-sm font-semibold text-white">Chart · metrics · analysis</p>
            </div>
            <div className="arc-panel-body flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 lg:px-4">
              {chartPanel}
            </div>
          </div>
          <div
            id="nexus-trade-panel"
            className="flex min-h-0 max-h-[calc(100vh-7rem)] min-w-0 flex-col overflow-hidden lg:sticky lg:top-20"
          >
            {tradePanel}
          </div>
        </div>

        <NexusMobileDock active={mobilePanel} onChange={handleMobilePanel} />
      </div>
    </div>
    </NexusAgentWalletProvider>
  );
}
