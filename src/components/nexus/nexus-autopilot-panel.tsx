"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useAgentWallet } from "@/hooks/use-agent-wallet";
import {
  AutopilotAmountMode,
  AUTOPILOT_INTERVALS,
  autopilotIntervalMs,
  estimateRequiredUsdc,
  loadAutopilot,
  saveAutopilot,
  tokenKey,
  type AutopilotConfig,
  type AutopilotInterval,
  type AutopilotLog,
} from "@/lib/nexus-autopilot";
import { nexusGlassCta } from "@/lib/nexus-action-glass";
import {
  Bot,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  DollarSign,
  Loader2,
  Percent,
  Play,
  Settings2,
  Shield,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { NexusAgentProvider, type NexusAgentRuntime } from "@/components/nexus/nexus-agent-context";
import { NexusExecutionPanel } from "@/components/nexus/nexus-execution-panel";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

const PCT_OPTIONS = [25, 50, 75, 100] as const;
const CHAINS = ["base", "ethereum", "arbitrum", "bsc", "polygon"] as const;

const INTERVAL_KEYS = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "12h",
  "1d",
  "1w",
  "custom",
] as const;

const defaultRuntime: NexusAgentRuntime = {
  enabled: false,
  nextIn: 0,
  running: false,
  logs: [],
  lastReasoning: null,
  displaySymbol: "—",
  stop: () => {},
  runNow: () => {},
};

export function NexusAutopilotPanel({
  token,
  onTradeComplete,
  embedded = false,
  onAgentLiveChange,
}: {
  token: TrendingMarketToken | null;
  onTradeComplete?: () => void;
  embedded?: boolean;
  /** Only reports enabled state — avoids re-rendering Buy/Sell every second */
  onAgentLiveChange?: (live: boolean) => void;
}) {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { usdcBalance: agentUsdc, refreshBalance, syncDeposits } = useAgentWallet();
  const { payArcFee, ensureArcNetwork, isPending: arcPending } = useArcSettlement();
  const [config, setConfig] = useState<AutopilotConfig>(() => loadAutopilot());
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [lastReasoning, setLastReasoning] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [nextIn, setNextIn] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [resolvedToken, setResolvedToken] = useState<TrendingMarketToken | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const configRef = useRef(config);
  const tokenRef = useRef(token);
  const resolvedRef = useRef(resolvedToken);
  const runCycleRef = useRef<() => Promise<void>>(async () => {});
  const agentUsdcRef = useRef(agentUsdc);
  const [agentRuntime, setAgentRuntime] = useState<NexusAgentRuntime>(defaultRuntime);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  useEffect(() => {
    resolvedRef.current = resolvedToken;
  }, [resolvedToken]);

  const requiredUsdc = estimateRequiredUsdc(config, agentUsdc);
  const hasDeposit = agentUsdc >= requiredUsdc;

  const persist = useCallback((next: AutopilotConfig) => {
    setConfig(next);
    saveAutopilot(next);
  }, []);

  const pushLog = useCallback((message: string, type: AutopilotLog["type"] = "info") => {
    setLogs((prev) => [{ at: new Date().toISOString(), message, type }, ...prev].slice(0, 20));
  }, []);

  const activeToken = useCallback(() => {
    if (config.amountMode === "custom_token" && config.customTokenAddress.trim()) {
      return resolvedRef.current;
    }
    return tokenRef.current;
  }, [config.amountMode, config.customTokenAddress]);

  useEffect(() => {
    const ca = config.customTokenAddress.trim();
    if (config.amountMode !== "custom_token" || !ca) {
      setResolvedToken(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const chain = config.customTokenChain || "base";
      const pairRes = await fetch(
        `/api/nexus/pair?chainId=${chain}&address=${encodeURIComponent(ca)}`,
        { cache: "no-store" },
      );
      const pair = await pairRes.json();
      if (cancelled) return;
      setResolvedToken({
        symbol: config.customTokenSymbol.trim() || "TOKEN",
        name: config.customTokenSymbol.trim() || "Custom token",
        tokenAddress: ca,
        chainId: chain,
        pairAddress: pair.pairAddress ?? "",
        priceUsd: pair.priceUsd ?? 0,
        change24h: 0,
        volume24h: 0,
        liquidityUsd: 0,
        url: pair.url ?? "",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [
    config.customTokenAddress,
    config.customTokenSymbol,
    config.customTokenChain,
    config.amountMode,
  ]);

  const resolveAmounts = useCallback(
    (
      cfg: AutopilotConfig,
      side: "buy" | "sell",
      positionAmount: number,
      priceUsd: number,
    ): { usdcAmount?: number; tokenAmount?: number } => {
      if (side === "buy") {
        if (cfg.amountMode === "custom_usdc") {
          return { usdcAmount: Math.max(0, Number(cfg.customUsdc) || 0) };
        }
        if (cfg.amountMode === "custom_token" && cfg.customAmountUnit === "usdc") {
          return { usdcAmount: Math.max(0, Number(cfg.customToken) || 0) };
        }
        const avail = Math.max(0, agentUsdcRef.current - 0.01);
        return { usdcAmount: Math.max(0.05, (avail * cfg.percent) / 100) };
      }
      if (cfg.amountMode === "custom_token") {
        if (cfg.customAmountUnit === "usdc" && priceUsd > 0) {
          const usdc = Math.max(0, Number(cfg.customToken) || 0);
          return { tokenAmount: usdc / priceUsd };
        }
        return { tokenAmount: Math.max(0, Number(cfg.customToken) || 0) };
      }
      return { tokenAmount: (positionAmount * cfg.percent) / 100 };
    },
    [agentUsdc],
  );

  const runCycle = useCallback(async () => {
    const t = activeToken();
    const cfg = configRef.current;
    if (!t || !address || !cfg.enabled) return;

    setRunning(true);
    try {
      const dcaBuy = cfg.mode === "buy_only";
      let agent: { action?: string; confidence?: number; whyAction?: string; reasoning?: string } | null =
        t.agent ?? null;

      if (!dcaBuy) {
        const analyzeRes = await fetch("/api/nexus/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chainId: t.chainId,
            tokenAddress: t.tokenAddress,
            deep: false,
            save: true,
          }),
        });
        const analyzeJson = await analyzeRes.json();
        agent = analyzeJson.agent ?? analyzeJson;
        if (analyzeJson.security?.honeypotRisk) {
          pushLog(`Security halt: ${analyzeJson.security.label}`, "error");
          return;
        }
        if (agent?.whyAction) setLastReasoning(agent.whyAction);
        else if (agent?.reasoning) setLastReasoning(agent.reasoning);
      }

      const signal = agent;

      let side: "buy" | "sell" | null = null;
      if (dcaBuy) {
        side = "buy";
        setLastReasoning(
          (prev) =>
            prev ??
            `Scheduled DCA buy · ${cfg.scheduleMode === "once" ? "one-time" : cfg.interval} · $${cfg.amountMode === "custom_usdc" ? cfg.customUsdc : "pct"} USDC`,
        );
      } else if (!signal) {
        pushLog("No signal — skipped", "error");
        return;
      } else {
        if ((signal.confidence ?? 0) < cfg.minConfidence) {
          pushLog(`Wait · ${signal.action} ${signal.confidence ?? 0}% (need ${cfg.minConfidence}%)`, "info");
          return;
        }
        if (cfg.mode === "buy_only" && signal.action === "BUY") side = "buy";
        else if (cfg.mode === "sell_only" && signal.action === "SELL") side = "sell";
        else if (cfg.mode === "follow_agent") {
          if (signal.action === "BUY") side = "buy";
          if (signal.action === "SELL") side = "sell";
        }
        if (!side) {
          pushLog(`Signal ${signal.action} — no trade`, "info");
          return;
        }
      }

      let vaultBal = agentUsdcRef.current;
      const refreshed = await refreshBalance();
      if (refreshed) {
        vaultBal = refreshed.balanceUsdc;
        agentUsdcRef.current = vaultBal;
      }
      const need = estimateRequiredUsdc(cfg, vaultBal);
      if (side === "buy" && vaultBal < need) {
        try {
          await syncDeposits();
          const again = await refreshBalance();
          vaultBal = again?.balanceUsdc ?? vaultBal;
          agentUsdcRef.current = vaultBal;
        } catch {
          /* user can sync manually */
        }
      }
      if (side === "buy" && vaultBal < need) {
        pushLog(
          `Vault $${vaultBal.toFixed(2)} — need $${need.toFixed(2)} for this buy. Sync deposits or Credit tx.`,
          "error",
        );
        return;
      }

      await ensureArcNetwork();
      const fee = await payArcFee("AUTOPILOT", `${t.tokenAddress}-${Date.now()}`);

      const portRes = await fetch(`/api/nexus/demo/portfolio?wallet=${address}&t=${Date.now()}`);
      const portData = await portRes.json();
      const position = (portData.positions ?? []).find(
        (p: { tokenAddress: string; tokenAmount?: number }) =>
          p.tokenAddress.toLowerCase() === t.tokenAddress.toLowerCase(),
      );

      const { usdcAmount, tokenAmount } = resolveAmounts(
        cfg,
        side,
        position?.tokenAmount ?? 0,
        t.priceUsd,
      );

      if (side === "buy" && (!usdcAmount || usdcAmount < 0.05)) {
        pushLog("Buy size too small (min $0.05 USDC) — check amount settings", "error");
        return;
      }
      if (side === "sell" && (!tokenAmount || tokenAmount <= 0)) {
        pushLog("Nothing to sell — check position", "error");
        return;
      }

      const tradeRes = await fetch("/api/nexus/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          side,
          symbol: t.symbol,
          tokenAddress: t.tokenAddress,
          sourceChain: t.chainId,
          tradeNetwork: "arc",
          usdcAmount,
          tokenAmount,
          priceUsd: t.priceUsd,
          arcFeeTxHash: fee.txHash,
          useAgentVault: side === "buy",
        }),
      });
      const tradeData = await tradeRes.json();
      if (!tradeRes.ok) throw new Error(tradeData.error ?? "Trade failed");

      await refreshBalance();
      const sigLabel = signal ? `${signal.action} ${signal.confidence}%` : "DCA schedule";
      const tr = tradeData.trade as
        | { usdcAmount?: number; tokenAmount?: number; symbol?: string }
        | undefined;
      if (side === "buy" && tr) {
        pushLog(
          `Bought ${(tr.tokenAmount ?? 0).toFixed(4)} ${tr.symbol ?? t.symbol} for $${(tr.usdcAmount ?? 0).toFixed(2)} · vault $${(tradeData.agentBalanceUsdc ?? vaultBal).toFixed(2)}`,
          "trade",
        );
      } else if (side === "sell" && tr) {
        pushLog(
          `Sold ${(tr.tokenAmount ?? 0).toFixed(4)} ${tr.symbol ?? t.symbol} → $${(tr.usdcAmount ?? 0).toFixed(2)} · ${sigLabel}`,
          "trade",
        );
      } else {
        pushLog(`Auto ${side.toUpperCase()} · ${sigLabel} · vault $${(tradeData.agentBalanceUsdc ?? vaultBal).toFixed(2)}`, "trade");
      }
      agentUsdcRef.current = Number(tradeData.agentBalanceUsdc ?? vaultBal);
      toast({ type: "success", title: "Autopilot trade", message: `${side.toUpperCase()} ${t.symbol}` });
      onTradeComplete?.();
      if (cfg.scheduleMode === "once") {
        persist({ ...configRef.current, enabled: false });
        pushLog("One-time run complete — agent stopped", "info");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Autopilot failed";
      pushLog(msg, "error");
      toast({ type: "error", title: "Autopilot error", message: msg });
    } finally {
      setRunning(false);
    }
  }, [
    activeToken,
    address,
    ensureArcNetwork,
    onTradeComplete,
    payArcFee,
    pushLog,
    resolveAmounts,
    toast,
    refreshBalance,
    syncDeposits,
  ]);

  runCycleRef.current = runCycle;

  const stopAgent = useCallback(() => {
    persist({ ...configRef.current, enabled: false });
    pushLog("Stopped from Execution tab", "info");
    toast({ type: "success", title: "Agent stopped", message: "Recurring trades paused" });
  }, [persist, pushLog, toast]);

  const displaySymbol =
    config.amountMode === "custom_token" && config.customTokenAddress
      ? config.customTokenSymbol || "Custom"
      : token?.symbol ?? "—";

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const t = activeToken();
    if (!config.enabled || !t || !isConnected) {
      setNextIn(0);
      startedRef.current = false;
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    const loop = () => {
      void runCycleRef.current().finally(() => {
        if (!configRef.current.enabled) return;
        if (configRef.current.scheduleMode !== "recurring") return;
        const wait = autopilotIntervalMs(configRef.current);
        timerRef.current = setTimeout(loop, wait);
      });
    };

    loop();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      startedRef.current = false;
    };
  }, [
    config.enabled,
    config.scheduleMode,
    config.interval,
    config.customIntervalMinutes,
    token?.tokenAddress,
    resolvedToken?.tokenAddress,
    isConnected,
  ]);

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!config.enabled || config.scheduleMode === "once") {
      setNextIn(0);
      return;
    }
    const ms = autopilotIntervalMs(config);
    setNextIn(Math.floor(ms / 1000));
    countdownRef.current = setInterval(() => {
      setNextIn((s) => (s <= 1 ? Math.floor(ms / 1000) : s - 1));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [config.enabled, config.scheduleMode, config.interval, config.customIntervalMinutes]);

  useEffect(() => {
    onAgentLiveChange?.(config.enabled);
  }, [config.enabled, onAgentLiveChange]);

  useEffect(() => {
    setAgentRuntime({
      enabled: config.enabled,
      nextIn,
      running,
      logs,
      lastReasoning,
      displaySymbol,
      stop: stopAgent,
      runNow: () => void runCycleRef.current(),
    });
  }, [config.enabled, nextIn, running, logs, lastReasoning, displaySymbol, stopAgent]);

  useEffect(() => {
    if (token) persist({ ...config, tokenKey: tokenKey(token.chainId, token.tokenAddress) });
  }, [token?.tokenAddress, token?.chainId]);

  const inner = (
    <div className="space-y-3">
      {!token && config.amountMode !== "custom_token" ? (
        <p className="text-sm text-white/55">Select a token from the feed, or use Custom Token mode.</p>
      ) : (
        <>
          <NexusExecutionPanel compact />

          {!hasDeposit && (
            <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
              <strong className="text-amber-50">Deposit required.</strong> Send at least ~$
              {requiredUsdc.toFixed(2)} USDC on Arc Testnet to the agent vault (Execution tab), then Sync
              deposits. Balance now: ${agentUsdc.toFixed(2)}.
            </div>
          )}

          {lastReasoning && (
            <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs leading-relaxed text-cyan-100/90">
              <Bot className="mr-1 inline h-3.5 w-3.5" />
              {lastReasoning}
            </p>
          )}

          <p className="nexus-caption flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Run mode
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => persist({ ...config, scheduleMode: "recurring" })}
              className={`min-h-[44px] rounded-xl border text-xs font-bold ${
                config.scheduleMode === "recurring"
                  ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                  : "border-white/10 text-white/55"
              }`}
            >
              Recurring schedule
            </button>
            <button
              type="button"
              onClick={() => persist({ ...config, scheduleMode: "once" })}
              className={`min-h-[44px] rounded-xl border text-xs font-bold ${
                config.scheduleMode === "once"
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 text-white/55"
              }`}
            >
              One-time trade
            </button>
          </div>

          <p className="nexus-caption flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            Schedule (daily / intraday)
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {INTERVAL_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => persist({ ...config, interval: key })}
                className={`min-h-[40px] rounded-lg border text-[9px] font-bold leading-tight ${
                  config.interval === key
                    ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                    : "border-white/10 bg-black/20 text-white/55"
                }`}
              >
                {key === "custom" ? "Custom" : AUTOPILOT_INTERVALS[key as Exclude<AutopilotInterval, "custom">]?.label ?? key}
              </button>
            ))}
          </div>
          {config.interval === "custom" && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-violet-300" />
              <input
                inputMode="numeric"
                value={config.customIntervalMinutes}
                onChange={(e) => persist({ ...config, customIntervalMinutes: e.target.value })}
                placeholder="Minutes between trades"
                className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-white"
              />
              <span className="text-xs text-white/50">min</span>
            </div>
          )}

          <p className="nexus-caption flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            Trade size (simple)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "percent" as AutopilotAmountMode, label: "% of USDC", icon: Percent },
                { id: "custom_usdc" as AutopilotAmountMode, label: "Fixed USDC", icon: DollarSign },
                { id: "custom_token" as AutopilotAmountMode, label: "Custom token", icon: TrendingDown },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => persist({ ...config, amountMode: id })}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-bold ${
                  config.amountMode === id
                    ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 text-white/55"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {config.amountMode === "percent" && (
            <div className="grid grid-cols-4 gap-2">
              {PCT_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => persist({ ...config, percent: pct })}
                  className={`min-h-[40px] rounded-lg border text-sm font-bold ${
                    config.percent === pct
                      ? "border-cyan-400/45 bg-cyan-500/15 text-cyan-100"
                      : "border-white/10 text-white/60"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}

          {config.amountMode === "custom_usdc" && (
            <div>
              <p className="nexus-caption mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> USDC per buy
              </p>
              <input
                inputMode="decimal"
                value={config.customUsdc}
                onChange={(e) => persist({ ...config, customUsdc: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 px-3 text-white"
                placeholder="e.g. 25"
              />
            </div>
          )}

          {config.amountMode === "custom_token" && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold text-white/80">Token contract (CA) or symbol</p>
              <select
                value={config.customTokenChain}
                onChange={(e) => persist({ ...config, customTokenChain: e.target.value })}
                className="w-full min-h-[40px] rounded-lg border border-white/15 bg-black/40 px-2 text-sm text-white"
              >
                {CHAINS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={config.customTokenAddress}
                onChange={(e) => persist({ ...config, customTokenAddress: e.target.value })}
                placeholder="0x… contract address"
                className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 px-3 text-xs text-white"
              />
              <input
                value={config.customTokenSymbol}
                onChange={(e) => persist({ ...config, customTokenSymbol: e.target.value })}
                placeholder="Symbol (optional) e.g. PEPE"
                className="w-full min-h-[40px] rounded-xl border border-white/15 bg-black/30 px-3 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => persist({ ...config, customAmountUnit: "tokens" })}
                  className={`min-h-[40px] rounded-lg border text-xs font-bold ${
                    config.customAmountUnit === "tokens"
                      ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                      : "border-white/10 text-white/55"
                  }`}
                >
                  Token amount
                </button>
                <button
                  type="button"
                  onClick={() => persist({ ...config, customAmountUnit: "usdc" })}
                  className={`min-h-[40px] rounded-lg border text-xs font-bold ${
                    config.customAmountUnit === "usdc"
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                      : "border-white/10 text-white/55"
                  }`}
                >
                  USDC amount
                </button>
              </div>
              <input
                inputMode="decimal"
                value={config.customToken}
                onChange={(e) => persist({ ...config, customToken: e.target.value })}
                placeholder={
                  config.customAmountUnit === "usdc" ? "USDC per buy" : "Tokens per sell"
                }
                className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 px-3 text-white"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/75"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-violet-300" />
              Trade rules (AI mode & confidence)
            </span>
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {advancedOpen && (
            <div className="space-y-2 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
              <p className="text-[11px] text-white/55">
                Minimum AI confidence to execute (recommended <strong className="text-white">55</strong>).
              </p>
              <input
                inputMode="numeric"
                placeholder="55"
                value={String(config.minConfidence)}
                onChange={(e) =>
                  persist({
                    ...config,
                    minConfidence: Math.min(95, Math.max(40, Number(e.target.value) || 55)),
                  })
                }
                className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 px-3 text-white"
              />
              {config.minConfidence < 55 && (
                <p className="text-[10px] text-amber-200/90">Below 55% — more trades, higher risk.</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "follow_agent" as const, label: "Follow AI", icon: Sparkles },
                    { id: "buy_only" as const, label: "Buy only", icon: TrendingUp },
                    { id: "sell_only" as const, label: "Sell only", icon: TrendingDown },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => persist({ ...config, mode: id })}
                    className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-bold ${
                      config.mode === id
                        ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                        : "border-white/10 text-white/55"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className={nexusGlassCta(
                "autopilot",
                "inline-flex min-h-[48px] flex-1 items-center justify-center gap-2",
                (config.amountMode === "custom_usdc"
                  ? Number(config.customUsdc) > 0
                  : config.amountMode === "custom_token"
                    ? Number(config.customToken) > 0
                    : config.percent > 0) && !config.enabled,
              )}
              disabled={!isConnected || running || arcPending || config.enabled}
              onClick={() => {
                void (async () => {
                  try {
                    await syncDeposits();
                  } catch {
                    /* still try with cached balance */
                  }
                  const w = await refreshBalance();
                  const bal = w?.balanceUsdc ?? agentUsdcRef.current;
                  agentUsdcRef.current = bal;
                  const need = estimateRequiredUsdc(config, bal);
                  if (bal < need) {
                    toast({
                      type: "error",
                      title: "Deposit to agent vault",
                      message: `Balance $${bal.toFixed(2)} — need $${need.toFixed(2)}. Send USDC from connected wallet, then Sync or Credit tx.`,
                    });
                    return;
                  }
                  const next = { ...config, enabled: true };
                  persist(next);
                  startedRef.current = false;
                  toast({
                    type: "success",
                    title: "Agent running",
                    message: `Vault $${bal.toFixed(2)} · ${displaySymbol} · $${need.toFixed(2)} per buy`,
                  });
                  pushLog(
                    `Run Agent — vault $${bal.toFixed(2)} · ~$${(config.amountMode === "custom_usdc" ? config.customUsdc : "pct")} per buy`,
                    "info",
                  );
                })();
              }}
            >
              {running || arcPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {config.enabled ? "Agent running…" : "Run Agent"}
            </button>
            <Button
              variant="outline"
              className="min-h-[48px] px-4"
              disabled={!isConnected || running || config.enabled}
              onClick={() => void runCycleRef.current()}
              title="One-shot without schedule"
            >
              <Zap className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const wrapped = <NexusAgentProvider value={agentRuntime}>{inner}</NexusAgentProvider>;

  if (embedded) return wrapped;

  return (
    <div className="arc-panel arc-panel-nexus overflow-hidden">
      <div className="arc-panel-stripe arc-panel-stripe-nexus" />
      <div className="flex items-center justify-between border-b border-violet-400/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-200" />
          <span className="text-base font-semibold text-white">NEXUS Autopilot</span>
          {config.enabled && (
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              LIVE
            </span>
          )}
        </div>
        {config.enabled && nextIn > 0 && (
          <span className="flex items-center gap-1 text-xs text-violet-200/80">
            <Calendar className="h-3.5 w-3.5" />
            Next {nextIn}s
          </span>
        )}
      </div>
      <div className="p-4">{wrapped}</div>
    </div>
  );
}
