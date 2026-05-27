"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { ArrowDownUp, LineChart, Radio, Sparkles } from "lucide-react";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { ArcBackground } from "@/components/layout/arc-background";
import { ArcIconFrame } from "@/components/ui/arc-icon-frame";
import { ArcPanel } from "@/components/ui/arc-panel";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { NexusPremiumHero } from "@/components/nexus/nexus-premium-hero";
import { NexusValueStrip } from "@/components/nexus/nexus-value-strip";
import { NexusTokenDetail } from "@/components/nexus/nexus-decision-card";
import { CommunityPulsePanel } from "@/components/shared/community-pulse-panel";
import type { CommunityPulse } from "@/lib/community-pulse";
import { NexusAlphaList } from "@/components/nexus/nexus-alpha-list";
import type { AlphaOpportunity } from "@/lib/nexus-agent";
import type { AlphaScanIntel } from "@/lib/alpha-scan-engine";
import { STABLE_FEED_LIMIT, ALPHA_SCAN_LIMIT } from "@/lib/feed-config";
import { ALPHA_SCAN_ERROR_TIP, ALPHA_SCAN_SUCCESS } from "@/lib/nexus-copy";
import { tokenKey } from "@/lib/feed-curation";
import { NexusQuickSwap } from "@/components/nexus/nexus-quick-swap";
import { filterTradableTokens } from "@/lib/token-filters";
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
import { NexusFeedTabs, type NexusFeedTab } from "@/components/nexus/nexus-feed-tabs";
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

  const [selectedToken, setSelectedToken] = useState<TrendingMarketToken | null>(null);
  const [alphaScanning, setAlphaScanning] = useState(false);
  const [alphaScanError, setAlphaScanError] = useState<string | null>(null);
  const [alphaOpportunities, setAlphaOpportunities] = useState<AlphaOpportunity[]>([]);
  const [alphaScanIntel, setAlphaScanIntel] = useState<AlphaScanIntel | null>(null);
  const [feedTab, setFeedTab] = useState<NexusFeedTab>("live");
  const [rightTab, setRightTab] = useState<"trade" | "portfolio">("trade");
  const [mobilePanel, setMobilePanel] = useState<NexusMobilePanel>("feed");
  const [tradeTab, setTradeTab] = useState<"buy" | "sell" | "agent">("buy");
  const [actionBanner, setActionBanner] = useState<{
    title: string;
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);
  const [feedTokens, setFeedTokens] = useState<TrendingMarketToken[]>([]);
  const [communityPulse, setCommunityPulse] = useState<CommunityPulse | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    try {
      localStorage.removeItem("nexus-agent-memory");
      localStorage.removeItem("nexus-saved-scans");
    } catch {
      /* ignore */
    }
  }, []);

  const displayDecision = selectedToken ? tokenToDecision(selectedToken) : null;

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

  async function runAlphaScan() {
    setAlphaScanning(true);
    setAlphaScanError(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 118_000);
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
          liveFeedKeys: feedTokens.map((t) => tokenKey(t)),
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
      setAlphaScanIntel((data.scanIntel as AlphaScanIntel | undefined) ?? null);
      setFeedTab("alpha");
      setMobilePanel("feed");
      scrollToMobileContent();
      const topBuy = rows.find((r) => r.action === "BUY");
      const sentiment = (data.scanIntel as AlphaScanIntel | undefined)?.marketSentiment;
      setActionBanner({
        type: "success",
        title: "Alpha scan complete",
        message: ALPHA_SCAN_SUCCESS(rows.length, topBuy?.symbol, sentiment?.label),
      });
      toast({
        type: "success",
        title: "Alpha scan complete",
        message: ALPHA_SCAN_SUCCESS(rows.length, topBuy?.symbol, sentiment?.label),
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "AbortError"
          ? "Scan took too long. Try again in a moment."
          : err instanceof Error
            ? err.message.replace(/GMGN|6551|Birdeye|ApeWisdom|DexScreener/gi, "data feed")
            : "Could not complete Alpha scan";
      setAlphaScanError(msg);
      setActionBanner({
        type: "error",
        title: "Alpha scan incomplete",
        message: `${msg} ${ALPHA_SCAN_ERROR_TIP}`,
      });
      toast({
        type: "error",
        title: "Alpha scan incomplete",
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
        icon: row.icon,
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

  const feedPanel = (
    <div className="nexus-feed-panel flex min-h-0 flex-1 flex-col max-lg:!border-0 max-lg:!bg-transparent">
      <NexusFeedTabs
        active={feedTab}
        onChange={setFeedTab}
        alphaCount={alphaOpportunities.length}
        onAlphaScan={() => void runAlphaScan()}
        alphaScanning={alphaScanning}
      />
      <div className="flex min-h-0 flex-1 flex-col max-lg:min-h-[280px] lg:min-h-0">
        {feedTab === "live" && (
          <NexusTrendingFeed
            className="h-full min-h-0"
            cleanFeed
            selectedAddress={selectedToken?.tokenAddress}
            onSelect={(t, opts) => handleTokenSelect(t, opts?.openChart ?? true)}
            onTokensRefresh={handleFeedRefresh}
            onOpenTrade={(tab) => {
              setTradeTab(tab);
              setRightTab("trade");
              setMobilePanel("trade");
              scrollToMobileContent();
            }}
          />
        )}
        {feedTab === "alpha" && (
          <div className="nexus-feed-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <NexusAlphaList
              opportunities={alphaOpportunities}
              scanIntel={alphaScanIntel}
              selectedAddress={selectedToken?.tokenAddress}
              onSelect={selectAlphaRow}
              scanning={alphaScanning}
              scanError={alphaScanError}
            />
          </div>
        )}
        {feedTab === "swap" && (
          <div className="nexus-feed-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <NexusQuickSwap tokens={feedTokens} onComplete={() => setPortfolioKey((k) => k + 1)} />
          </div>
        )}
      </div>
    </div>
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
        <p className="arc-caption hidden px-1 text-white/40 lg:block">
          Deep intel (optional) — agent already decided above; expand only if you want detail
        </p>
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
        {communityPulse && communityPulse.items.length > 0 && (
          <ArcPanel theme="nexus" title={`Community · ${communityPulse.topic}`} icon={Radio}>
            <CommunityPulsePanel pulse={communityPulse} compact />
          </ArcPanel>
        )}
        {displayDecision && (
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden max-lg:pb-24">
      <div className="lg:hidden mb-2 space-y-2">
        <NexusTokenStrip
          tokens={feedTokens}
          selected={selectedToken}
          onSelect={(t) => handleTokenSelect(t)}
          mobileLimit={STABLE_FEED_LIMIT}
        />
        {selectedToken && <NexusMobileTokenActions token={selectedToken} onTradeTab={openTradePanel} />}
      </div>
      <NexusTradeHub
        embedded
        token={selectedToken}
        activeTab={tradeTab}
        onTabChange={setTradeTab}
        onTradeComplete={() => setPortfolioKey((k) => k + 1)}
      />
    </div>
  );

  const portfolioPanel = (
    <div className="nexus-feed-scroll min-h-0 flex-1 overflow-y-auto p-1 max-lg:pb-24">
      <NexusPortfolio
        refreshKey={portfolioKey}
        livePrices={livePrices}
        feedTokens={feedTokens}
        showTxHistory
      />
    </div>
  );

  const rightColumnPanel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-2 flex gap-1.5 border-b border-white/[0.06] pb-2">
        <button
          type="button"
          onClick={() => setRightTab("trade")}
          className={cn(
            "arc-btn-pill flex-1 px-3 py-2 text-sm font-semibold",
            rightTab === "trade" ? "arc-nav-pill-active text-emerald-50" : "text-white/50",
          )}
        >
          Buy · Sell · Agent
        </button>
        <button
          type="button"
          onClick={() => setRightTab("portfolio")}
          className={cn(
            "arc-btn-pill flex-1 px-3 py-2 text-sm font-semibold",
            rightTab === "portfolio"
              ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100"
              : "text-white/50",
          )}
        >
          Portfolio
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {rightTab === "trade" ? tradePanel : portfolioPanel}
      </div>
    </div>
  );

  return (
    <NexusAgentWalletProvider>
    <div className="relative min-h-screen text-white" data-nexus-page data-nexus-easy-mode data-arc-theme="nexus">
      <ArcBackground theme="nexus" />

      <div className="relative mx-auto w-full max-w-[1920px] px-3 py-2 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-4 lg:py-8 lg:pb-8 xl:px-6">
        <NexusValueStrip />
        <NexusPremiumHero stableCount={STABLE_FEED_LIMIT} />

        <NexusMobileContextBar
          selectedToken={selectedToken}
          activePanel={mobilePanel}
          onPanelChange={(p) => {
            setMobilePanel(p);
            scrollToMobileContent();
          }}
        />

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
          {mobilePanel === "portfolio" && portfolioPanel}
        </div>

        <div
          className="hidden items-start gap-4 lg:grid lg:gap-5 xl:gap-6"
          data-nexus-layout="desktop"
        >
          <div className="nexus-column-shell nexus-column-panel arc-panel arc-panel-nexus flex min-h-0 max-h-[calc(100vh-5.25rem)] min-w-0 flex-col overflow-hidden lg:sticky lg:top-[4.75rem]">
            <div className="arc-panel-stripe arc-panel-stripe-nexus" />
            <div className="nexus-column-head shrink-0 border-b border-white/[0.06] px-4 py-2.5">
              <p className="arc-caption text-emerald-300/80">Discovery</p>
              <p className="text-sm font-semibold text-white">Market feed</p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 lg:px-3">
              {feedPanel}
            </div>
          </div>
          <div
            id="nexus-chart-panel"
            className="nexus-column-shell nexus-center-panel nexus-column-panel arc-panel arc-panel-nexus flex min-h-0 max-h-[calc(100vh-5.25rem)] min-w-0 flex-col overflow-hidden lg:sticky lg:top-[4.75rem]"
          >
            <div className="arc-panel-stripe arc-panel-stripe-nexus" />
            <div className="nexus-column-head shrink-0 border-b border-white/[0.06] px-4 py-2.5">
              <p className="arc-caption text-violet-300/80">Token intelligence</p>
              <p className="text-sm font-semibold text-white">Chart · metrics · analysis</p>
            </div>
            <div className="arc-panel-body flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 lg:px-4">
              {chartPanel}
            </div>
          </div>
          <div
            id="nexus-trade-panel"
            className="nexus-column-shell nexus-column-panel arc-panel arc-panel-nexus flex min-h-0 max-h-[calc(100vh-5.25rem)] min-w-0 flex-col overflow-hidden lg:sticky lg:top-[4.75rem]"
          >
            <div className="arc-panel-stripe arc-panel-stripe-nexus" />
            <div className="nexus-column-head shrink-0 border-b border-white/[0.06] px-4 py-2.5">
              <p className="arc-caption text-cyan-300/80">Wallet</p>
              <p className="text-sm font-semibold text-white">Trade &amp; portfolio</p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 lg:px-3">
              {rightColumnPanel}
            </div>
          </div>
        </div>

        <NexusMobileDock active={mobilePanel} onChange={handleMobilePanel} />
      </div>
    </div>
    </NexusAgentWalletProvider>
  );
}
