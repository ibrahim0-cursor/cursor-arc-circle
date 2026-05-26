"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { ARC_TESTNET_ID } from "@/lib/arc-chain";
import {
  Bot,
  Brain,
  Clock,
  Loader2,
  Pause,
  Percent,
  Play,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import {
  AUTOPILOT_INTERVALS,
  loadAutopilot,
  saveAutopilot,
  tokenKey,
  type AutopilotAmountMode,
  type AutopilotConfig,
  type AutopilotInterval,
  type AutopilotLog,
} from "@/lib/nexus-autopilot";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

const PCT_OPTIONS = [25, 50, 75, 100] as const;

export function NexusAutopilotPanel({
  token,
  onTradeComplete,
  embedded = false,
}: {
  token: TrendingMarketToken | null;
  onTradeComplete?: () => void;
  embedded?: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: ARC_TESTNET_ID });
  const { payArcFee, ensureArcNetwork, isPending: arcPending } = useArcSettlement();
  const [config, setConfig] = useState<AutopilotConfig>(() => loadAutopilot());
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [lastReasoning, setLastReasoning] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [nextIn, setNextIn] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef(config);
  const tokenRef = useRef(token);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const persist = useCallback((next: AutopilotConfig) => {
    setConfig(next);
    saveAutopilot(next);
  }, []);

  const pushLog = useCallback((message: string, type: AutopilotLog["type"] = "info") => {
    setLogs((prev) => [{ at: new Date().toISOString(), message, type }, ...prev].slice(0, 15));
  }, []);

  const resolveAmounts = useCallback(
    (
      cfg: AutopilotConfig,
      side: "buy" | "sell",
      positionAmount: number,
    ): { usdcAmount?: number; tokenAmount?: number } => {
      if (side === "buy") {
        if (cfg.amountMode === "custom_usdc") {
          const n = Math.max(0, Number(cfg.customUsdc) || 0);
          return { usdcAmount: n };
        }
        const avail = Math.max(0, Number(balance?.formatted ?? 0) - 0.02);
        return { usdcAmount: Math.max(0.5, (avail * cfg.percent) / 100) };
      }
      if (cfg.amountMode === "custom_token") {
        const n = Math.max(0, Number(cfg.customToken) || 0);
        return { tokenAmount: n };
      }
      return { tokenAmount: (positionAmount * cfg.percent) / 100 };
    },
    [balance?.formatted],
  );

  const runCycle = useCallback(async () => {
    const t = tokenRef.current;
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
      if (analyzeJson.agent?.whyAction) {
        setLastReasoning(analyzeJson.agent.whyAction);
      } else if (agent?.reasoning) {
        setLastReasoning(agent.reasoning);
      }

      const feedRes = await fetch(`/api/nexus/feed?limit=20&t=${Date.now()}`, { cache: "no-store" });
      const feedJson = await feedRes.json();
      const fresh = (feedJson.tokens ?? []).find(
        (x: TrendingMarketToken) =>
          x.tokenAddress.toLowerCase() === t.tokenAddress.toLowerCase() && x.chainId === t.chainId,
      );
      const live = fresh ?? t;
      const signal = live.agent ?? agent;
      if (!signal) {
        pushLog("No agent signal — skipped", "error");
        return;
      }
      if (signal.confidence < cfg.minConfidence) {
        pushLog(
          `Skipped · ${signal.action} @ ${signal.confidence}% (min ${cfg.minConfidence}%)`,
          "info",
        );
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
        pushLog(`Agent ${signal.action} — no trade this cycle`, "info");
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
      );

      if (side === "buy" && (!usdcAmount || usdcAmount < 0.5)) {
        pushLog("Buy amount too small — check balance or custom USDC", "error");
        return;
      }
      if (side === "sell" && (!tokenAmount || tokenAmount <= 0)) {
        pushLog("Sell amount empty — check position or custom token amount", "error");
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
          priceUsd: live.priceUsd,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const tradeData = await tradeRes.json();
      if (!tradeRes.ok) throw new Error(tradeData.error ?? "Autopilot trade failed");

      const sizeLabel =
        cfg.amountMode === "custom_usdc"
          ? `$${usdcAmount} USDC`
          : cfg.amountMode === "custom_token"
            ? `${tokenAmount} tokens`
            : `${cfg.percent}%`;

      pushLog(
        `Auto ${side.toUpperCase()} ${sizeLabel} · ${signal.action} ${signal.confidence}% · RSI/MACD checked`,
        "trade",
      );
      onTradeComplete?.();
    } catch (e) {
      pushLog(e instanceof Error ? e.message : "Autopilot failed", "error");
    } finally {
      setRunning(false);
    }
  }, [
    address,
    ensureArcNetwork,
    onTradeComplete,
    payArcFee,
    pushLog,
    resolveAmounts,
  ]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!config.enabled || !token || !isConnected) {
      setNextIn(0);
      return;
    }

    const ms = AUTOPILOT_INTERVALS[config.interval].ms;
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
  }, [config.enabled, config.interval, token, isConnected, runCycle]);

  useEffect(() => {
    if (token) {
      persist({ ...config, tokenKey: tokenKey(token.chainId, token.tokenAddress) });
    }
  }, [token?.tokenAddress, token?.chainId]);

  const inner = (
    <div className="space-y-3">
      {!token ? (
        <p className="text-sm text-white/55">Select a token to enable autonomous trading.</p>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-white/70">
            Full deep scan (news, mcap, liq, FDV, flow, RSI, MACD) then auto-trades{" "}
            <strong className="text-white">{token.symbol}</strong> on your schedule.
          </p>

          {lastReasoning && (
            <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2.5">
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200/80">
                <Brain className="h-3.5 w-3.5" />
                Latest agent reasoning
              </p>
              <p className="text-xs leading-relaxed text-white/80">{lastReasoning}</p>
            </div>
          )}

          <div className="grid grid-cols-5 gap-1.5">
            {(Object.keys(AUTOPILOT_INTERVALS) as AutopilotInterval[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => persist({ ...config, interval: key })}
                className={`min-h-[40px] rounded-lg border text-[10px] font-bold ${
                  config.interval === key
                    ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                    : "border-white/10 bg-black/20 text-white/55"
                }`}
              >
                {AUTOPILOT_INTERVALS[key].label}
              </button>
            ))}
          </div>

          <p className="nexus-caption">Size mode</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "percent" as AutopilotAmountMode, label: "% Balance", icon: Percent },
                { id: "custom_usdc" as AutopilotAmountMode, label: "Custom USDC", icon: TrendingUp },
                { id: "custom_token" as AutopilotAmountMode, label: "Custom tokens", icon: TrendingDown },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => persist({ ...config, amountMode: id })}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-bold ${
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
              <p className="nexus-caption mb-1">Custom USDC per buy</p>
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
            <div>
              <p className="nexus-caption mb-1">Custom {token.symbol} per sell</p>
              <input
                inputMode="decimal"
                value={config.customToken}
                onChange={(e) => persist({ ...config, customToken: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/30 px-3 text-white"
                placeholder="Token amount"
              />
            </div>
          )}

          <div>
            <p className="nexus-caption mb-1">Min confidence % to trade</p>
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
          </div>

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

          <div className="flex gap-2">
            <Button
              variant={config.enabled ? "outline" : "nexus"}
              className="min-h-[48px] flex-1 gap-2"
              disabled={!isConnected || running || arcPending}
              onClick={() => {
                const next = { ...config, enabled: !config.enabled };
                persist(next);
                pushLog(next.enabled ? "Autopilot LIVE" : "Autopilot paused", "info");
              }}
            >
              {running || arcPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : config.enabled ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {config.enabled ? "Pause Agent" : "Start Agent"}
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
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-white/8 bg-black/25 p-2">
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
            <Clock className="h-3.5 w-3.5" />
            Next {nextIn}s
          </span>
        )}
      </div>
      <div className="p-4">{inner}</div>
    </div>
  );
}
