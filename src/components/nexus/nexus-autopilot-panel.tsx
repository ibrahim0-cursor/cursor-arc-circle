"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { ARC_TESTNET_ID } from "@/lib/arc-chain";
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
import {
  Bot,
  Brain,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  DollarSign,
  Loader2,
  Pause,
  Percent,
  Play,
  Settings2,
  Shield,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
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

export function NexusAutopilotPanel({
  token,
  onTradeComplete,
  embedded = false,
}: {
  token: TrendingMarketToken | null;
  onTradeComplete?: () => void;
  embedded?: boolean;
}) {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: ARC_TESTNET_ID });
  const { payArcFee, ensureArcNetwork, isPending: arcPending } = useArcSettlement();
  const [config, setConfig] = useState<AutopilotConfig>(() => loadAutopilot());
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [lastReasoning, setLastReasoning] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [nextIn, setNextIn] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [resolvedToken, setResolvedToken] = useState<TrendingMarketToken | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef(config);
  const tokenRef = useRef(token);
  const resolvedRef = useRef(resolvedToken);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  useEffect(() => {
    resolvedRef.current = resolvedToken;
  }, [resolvedToken]);

  const usdcBalance = Number(balance?.formatted ?? 0);
  const requiredUsdc = estimateRequiredUsdc(config, usdcBalance);
  const hasDeposit = usdcBalance >= requiredUsdc;

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
        const avail = Math.max(0, usdcBalance - 0.02);
        return { usdcAmount: Math.max(0.5, (avail * cfg.percent) / 100) };
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
    [usdcBalance],
  );

  const runCycle = useCallback(async () => {
    const t = activeToken();
    const cfg = configRef.current;
    if (!t || !address || !cfg.enabled) return;

    setRunning(true);
    try {
      const analyzeRes = await fetch("/api/nexus/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: t.chainId,
          tokenAddress: t.tokenAddress,
          deep: true,
        }),
      });
      const analyzeJson = await analyzeRes.json();
      const agent = analyzeJson.agent ?? analyzeJson;
      if (analyzeJson.security?.honeypotRisk) {
        pushLog(`Security halt: ${analyzeJson.security.label}`, "error");
        return;
      }
      if (agent?.whyAction) setLastReasoning(agent.whyAction);
      else if (agent?.reasoning) setLastReasoning(agent.reasoning);

      const signal = t.agent ?? agent;
      if (!signal) {
        pushLog("No signal — skipped", "error");
        return;
      }
      if (signal.confidence < cfg.minConfidence) {
        pushLog(`Wait · ${signal.action} ${signal.confidence}% (need ${cfg.minConfidence}%)`, "info");
        return;
      }

      let side: "buy" | "sell" | null = null;
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

      if (side === "buy" && !hasDeposit) {
        pushLog(`Need ~$${requiredUsdc.toFixed(2)} USDC on Arc — deposit first`, "error");
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

      if (side === "buy" && (!usdcAmount || usdcAmount < 0.5)) {
        pushLog("Buy size too small — check deposit", "error");
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
        }),
      });
      const tradeData = await tradeRes.json();
      if (!tradeRes.ok) throw new Error(tradeData.error ?? "Trade failed");

      pushLog(`Auto ${side.toUpperCase()} · ${signal.action} ${signal.confidence}%`, "trade");
      toast({ type: "success", title: "Autopilot trade", message: `${side.toUpperCase()} ${t.symbol}` });
      onTradeComplete?.();
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
    hasDeposit,
    onTradeComplete,
    payArcFee,
    pushLog,
    requiredUsdc,
    resolveAmounts,
    toast,
  ]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const t = activeToken();
    if (!config.enabled || !t || !isConnected) {
      setNextIn(0);
      return;
    }

    const ms = autopilotIntervalMs(config);
    setNextIn(Math.floor(ms / 1000));

    const tick = setInterval(() => {
      setNextIn((s) => {
        if (s <= 1) {
          void runCycle();
          return Math.floor(ms / 1000);
        }
        return s - 1;
      });
    }, 1000);

    timerRef.current = tick;
    return () => clearInterval(tick);
  }, [config.enabled, config.interval, config.customIntervalMinutes, token, resolvedToken, isConnected, runCycle, activeToken, config]);

  useEffect(() => {
    if (token) persist({ ...config, tokenKey: tokenKey(token.chainId, token.tokenAddress) });
  }, [token?.tokenAddress, token?.chainId]);

  const displaySymbol =
    config.amountMode === "custom_token" && config.customTokenAddress
      ? config.customTokenSymbol || "Custom"
      : token?.symbol ?? "—";

  const inner = (
    <div className="space-y-3">
      {config.enabled && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-rose-100">
            <Bot className="h-4 w-4 animate-pulse" />
            Agent running · next in {nextIn}s
          </span>
          <button
            type="button"
            onClick={() => {
              persist({ ...config, enabled: false });
              pushLog("Cancelled by user", "info");
              toast({ type: "info", title: "Autopilot cancelled" });
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-400/50 bg-black/30 px-3 py-1.5 text-xs font-bold text-rose-100"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
      )}

      {!token && config.amountMode !== "custom_token" ? (
        <p className="text-sm text-white/55">Select a token from the feed, or use Custom Token mode.</p>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-white/70">
            <Shield className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
            Demo trades only — deposit USDC on Arc first. Agent pays ~$0.01 fee txs; no withdrawals from your wallet.
          </p>

          <div
            className={`rounded-xl border px-3 py-2.5 ${
              hasDeposit ? "border-emerald-400/30 bg-emerald-500/10" : "border-amber-400/30 bg-amber-500/10"
            }`}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <Wallet className="h-4 w-4 text-cyan-200" />
              Balance {usdcBalance.toFixed(2)} USDC
            </p>
            <p className="mt-1 text-xs text-white/60">
              {hasDeposit
                ? `Ready · ~$${requiredUsdc.toFixed(2)} needed per buy cycle`
                : `Deposit at least ~$${requiredUsdc.toFixed(2)} USDC on Arc Testnet to start`}
            </p>
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
              Advanced (optional)
            </span>
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {advancedOpen && (
            <div className="space-y-2 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
              <p className="text-[11px] text-white/55">
                Only trade when AI confidence is at least this % (default 55).
              </p>
              <input
                inputMode="numeric"
                value={String(config.minConfidence)}
                onChange={(e) =>
                  persist({
                    ...config,
                    minConfidence: Math.min(95, Math.max(40, Number(e.target.value) || 55)),
                  })
                }
                className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 px-3 text-white"
              />
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

          {lastReasoning && (
            <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2.5">
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200/80">
                <Brain className="h-3.5 w-3.5" />
                Latest reasoning · {displaySymbol}
              </p>
              <p className="text-xs leading-relaxed text-white/80">{lastReasoning}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant={config.enabled ? "outline" : "nexus"}
              className="min-h-[48px] flex-1 gap-2"
              disabled={!isConnected || running || arcPending || (!hasDeposit && !config.enabled)}
              onClick={() => {
                if (!config.enabled && !hasDeposit) {
                  toast({
                    type: "error",
                    title: "Deposit USDC first",
                    message: `Need ~$${requiredUsdc.toFixed(2)} on Arc Testnet`,
                  });
                  return;
                }
                const next = { ...config, enabled: !config.enabled };
                persist(next);
                if (next.enabled) {
                  toast({
                    type: "success",
                    title: "Autopilot started",
                    message: `Runs every ${config.interval === "custom" ? `${config.customIntervalMinutes}m` : AUTOPILOT_INTERVALS[config.interval as keyof typeof AUTOPILOT_INTERVALS]?.label}`,
                  });
                }
                pushLog(next.enabled ? "Agent LIVE" : "Paused", "info");
              }}
            >
              {running || arcPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : config.enabled ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {config.enabled ? "Pause" : "Start Agent"}
            </Button>
            <Button
              variant="outline"
              className="min-h-[48px] px-4"
              disabled={!isConnected || running}
              onClick={() => runCycle()}
            >
              <Zap className="h-4 w-4" />
            </Button>
          </div>

          {logs.length > 0 && (
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-white/8 bg-black/25 p-2">
              {logs.map((log, i) => (
                <p
                  key={log.at + i}
                  className={`text-[11px] ${
                    log.type === "trade"
                      ? "text-emerald-300"
                      : log.type === "error"
                        ? "text-rose-300"
                        : "text-white/55"
                  }`}
                >
                  {new Date(log.at).toLocaleTimeString()} — {log.message}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  if (embedded) return inner;

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 to-cyan-500/5">
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
      <div className="p-4">{inner}</div>
    </div>
  );
}
