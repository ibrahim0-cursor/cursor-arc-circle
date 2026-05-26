"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import {
  ArrowDownUp,
  Bot,
  Coins,
  DollarSign,
  ExternalLink,
  Loader2,
  Percent,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { NexusAutopilotPanel } from "@/components/nexus/nexus-autopilot-panel";
import { NexusTradeBalanceBar } from "@/components/nexus/nexus-trade-balance-bar";
import { NexusTokenChatButton } from "@/components/nexus/nexus-token-chat";
import { NexusAgentWalletProvider } from "@/components/nexus/nexus-agent-wallet-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { buildDemoQuote } from "@/lib/demo-trading";
import { arcExplorerAddress, arcExplorerTx } from "@/lib/arc";
import { ARC_TESTNET_ID } from "@/lib/arc-chain";
import { formatPct, formatUsd, truncateHash } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import type { NexusDecision, DemoPosition } from "@/lib/storage";

type TradeToken = TrendingMarketToken | NexusDecision | null;

function asTradeToken(token: TradeToken) {
  if (!token) return null;
  return {
    symbol: token.symbol,
    tokenAddress: "token" in token ? token.token : token.tokenAddress,
    chainId: token.chainId,
    priceUsd: token.priceUsd,
    pairAddress: token.pairAddress,
  };
}

const TRADE_NETWORK = "arc" as const;
const BUY_PRESETS = [10, 25, 50, 100] as const;
const PCT_OPTIONS = [25, 50, 75, 100] as const;

function formatAmount(n: number) {
  if (n >= 1000) return n.toFixed(0);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(6);
}

type TradeTab = "buy" | "sell" | "agent";

export function NexusTradeHub({
  token,
  onTradeComplete,
  activeTab,
  onTabChange,
}: {
  token: TradeToken;
  onTradeComplete?: () => void;
  activeTab?: TradeTab;
  onTabChange?: (tab: TradeTab) => void;
}) {
  const [internalTab, setInternalTab] = useState<TradeTab>("buy");
  const tradeTab = activeTab ?? internalTab;
  const [agentLive, setAgentLive] = useState(false);
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { payArcFee, ensureArcNetwork, isPending: arcPending, feeUsd } = useArcSettlement();
  const { data: balance } = useBalance({ address, chainId: ARC_TESTNET_ID });

  const setTab = (tab: TradeTab) => {
    if (activeTab === undefined) setInternalTab(tab);
    onTabChange?.(tab);
  };

  const trade = asTradeToken(token);
  const side = tradeTab === "sell" ? "sell" : "buy";
  const [amount, setAmount] = useState("25");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ hash: string; block?: number } | null>(null);
  const [position, setPosition] = useState<DemoPosition | null>(null);

  const usdcBalance = balance ? Number(balance.formatted) : 0;
  const tokenBalance = position?.tokenAmount ?? 0;

  useEffect(() => {
    async function loadPosition() {
      if (!address || !trade) return;
      const res = await fetch(`/api/nexus/demo/portfolio?wallet=${address}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const pos = (data.positions ?? []).find(
        (p: DemoPosition) =>
          p.tokenAddress.toLowerCase() === trade.tokenAddress.toLowerCase() &&
          p.tradeNetwork === TRADE_NETWORK,
      );
      setPosition(pos ?? null);
    }
    loadPosition();
  }, [address, trade?.tokenAddress, lastTx]);

  const livePrice = trade?.priceUsd ?? 0;
  const unrealizedPnl =
    position && livePrice > 0 ? position.tokenAmount * livePrice - position.usdcSpent : null;
  const unrealizedPct =
    position && position.usdcSpent > 0 && unrealizedPnl != null
      ? (unrealizedPnl / position.usdcSpent) * 100
      : null;

  const amountNum = Math.max(0, Number(amount) || 0);

  const quote = useMemo(() => {
    if (!trade || amountNum <= 0) return null;
    return buildDemoQuote({
      side,
      usdcAmount: side === "buy" ? amountNum : undefined,
      tokenAmount: side === "sell" ? amountNum : undefined,
      priceUsd: livePrice,
      position,
    });
  }, [trade, side, amountNum, livePrice, position]);

  function applyPct(pct: number) {
    if (side === "buy") {
      const spend = (usdcBalance * pct) / 100;
      setAmount(formatAmount(Math.max(0, spend - feeUsd)));
      return;
    }
    if (side === "sell") {
      setAmount(formatAmount((tokenBalance * pct) / 100));
      return;
    }
  }

  function applyBuyPreset(usdc: number) {
    setTab("buy");
    setAmount(String(usdc));
  }

  function applySellUsdcReceive(targetUsdc: number) {
    if (livePrice <= 0) return;
    const tokens = Math.min(tokenBalance, targetUsdc / livePrice);
    setAmount(formatAmount(tokens));
  }

  async function executeDemoTrade() {
    if (!trade || !address || amountNum <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (side === "buy" && amountNum > usdcBalance) {
      setError("Insufficient USDC balance on Arc");
      return;
    }
    if (side === "sell" && amountNum > tokenBalance) {
      setError("Insufficient token balance");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await ensureArcNetwork();
      const fee = await payArcFee(
        side.toUpperCase(),
        `${trade.tokenAddress}-${TRADE_NETWORK}-${side}-${amountNum}-${Date.now()}`,
      );

      const res = await fetch("/api/nexus/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          side,
          symbol: trade.symbol,
          tokenAddress: trade.tokenAddress,
          sourceChain: trade.chainId,
          tradeNetwork: TRADE_NETWORK,
          usdcAmount: side === "buy" ? amountNum : undefined,
          tokenAmount: side === "sell" ? amountNum : undefined,
          priceUsd: livePrice,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo trade failed");

      setLastTx({ hash: fee.txHash, block: fee.blockNumber });
      toast({
        type: "success",
        title: side === "buy" ? "Buy executed" : "Sell executed",
        message: quote?.label ?? `Demo ${side} recorded on Arc`,
      });
      onTradeComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Trade failed";
      setError(msg);
      toast({ type: "error", title: `${side === "buy" ? "Buy" : "Sell"} failed`, message: msg });
    } finally {
      setLoading(false);
    }
  }

  const marketToken =
    token && "tokenAddress" in token
      ? (token as TrendingMarketToken)
      : token && "token" in token
        ? ({
            symbol: token.symbol,
            name: token.name ?? token.symbol,
            tokenAddress: token.token,
            chainId: token.chainId,
            priceUsd: token.priceUsd,
            pairAddress: token.pairAddress ?? "",
            change24h: token.change24h,
            volume24h: token.volume24h ?? 0,
            liquidityUsd: token.liquidityUsd ?? 0,
            url: token.dexUrl ?? "",
          } as TrendingMarketToken)
        : null;

  return (
    <NexusAgentWalletProvider>
      <div className="overflow-hidden rounded-2xl border border-cyan-300/25 bg-white/[0.04] shadow-[0_0_32px_-8px_rgba(103,232,249,0.4)] backdrop-blur-xl">
        <div className="border-b border-cyan-300/15 px-4 py-3">
          <div className="mb-3 flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-cyan-200" />
            <span className="text-base font-semibold text-cyan-50">Arc Trade · Agent</span>
            {agentLive && (
              <span className="ml-auto rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                LIVE
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "buy" as const, label: "Buy", icon: TrendingUp },
                { id: "sell" as const, label: "Sell", icon: TrendingDown },
                { id: "agent" as const, label: "Autopilot", icon: Bot },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-bold transition active:scale-[0.98] ${
                  tradeTab === id
                    ? id === "agent"
                      ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                      : id === "buy"
                        ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                        : "border-rose-400/50 bg-rose-500/20 text-rose-100"
                    : "border-white/12 bg-white/[0.03] text-white/65"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

      <div className="space-y-3 p-4">
        {!trade && tradeTab !== "agent" ? (
          <p className="text-center text-sm text-white/60">Select a token from the feed to trade.</p>
        ) : (
          <>
            <div className={tradeTab !== "agent" ? "hidden" : "space-y-3"} aria-hidden={tradeTab !== "agent"}>
              {marketToken && (
                <div className="flex justify-end">
                  <NexusTokenChatButton token={marketToken} onOpenTrade={setTab} />
                </div>
              )}
              <NexusTradeBalanceBar symbol={trade?.symbol} position={position} />
              <NexusAutopilotPanel
                token={marketToken}
                onTradeComplete={onTradeComplete}
                embedded
                onAgentLiveChange={setAgentLive}
              />
            </div>
            {tradeTab !== "agent" && !trade ? (
              <p className="text-center text-sm text-white/60">Select a token from the feed to trade.</p>
            ) : tradeTab !== "agent" && trade ? (
          <>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-2.5">
              <div>
                <span className="text-lg font-bold text-white">{trade.symbol}</span>
                <span className="ml-2 text-sm text-white/70">{formatUsd(livePrice)}</span>
              </div>
              {marketToken && <NexusTokenChatButton token={marketToken} onOpenTrade={setTab} />}
            </div>
            <NexusTradeBalanceBar symbol={trade.symbol} position={position} />

              {position && position.tokenAmount > 0 && unrealizedPnl != null && (
                <div
                  className={`rounded-xl border px-3 py-2.5 text-sm ${
                    unrealizedPnl >= 0
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                      : "border-rose-400/30 bg-rose-500/10 text-rose-100"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {position.tokenAmount.toFixed(4)} {trade.symbol}
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      {unrealizedPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {formatUsd(unrealizedPnl)}
                      {unrealizedPct != null && ` (${formatPct(unrealizedPct)})`}
                    </span>
                  </div>
                </div>
              )}

              {side === "buy" && (
                <div>
                  <p className="nexus-caption mb-2 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-300" />
                    Quick spend (USDC)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {BUY_PRESETS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => applyBuyPreset(v)}
                        className="min-h-[40px] rounded-lg border border-emerald-400/20 bg-emerald-500/10 text-sm font-medium text-emerald-100 active:bg-emerald-500/20"
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {side === "sell" && (
                <div>
                  <p className="nexus-caption mb-2 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-rose-300" />
                    Quick receive (USDC)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {BUY_PRESETS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => applySellUsdcReceive(v)}
                        className="min-h-[40px] rounded-lg border border-rose-400/20 bg-rose-500/10 text-sm font-medium text-rose-100 active:bg-rose-500/20"
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-white/45">
                    Sets {trade.symbol} amount to receive ~USDC above (wallet balance capped).
                  </p>
                </div>
              )}

              <p className="nexus-caption flex items-center gap-1.5">
                {side === "buy" ? (
                  <DollarSign className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Coins className="h-3.5 w-3.5 text-rose-300" />
                )}
                {side === "buy"
                  ? "Spend USDC"
                  : `Sell ${trade.symbol} or use USDC presets · % of holdings`}
              </p>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full min-h-[48px] rounded-xl border border-cyan-300/20 bg-black/30 px-4 text-lg font-medium text-white outline-none focus:border-cyan-300/50"
                placeholder="0"
              />
              <div className="grid grid-cols-4 gap-2">
                {PCT_OPTIONS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyPct(pct)}
                    className="min-h-[44px] rounded-xl border border-violet-400/25 bg-violet-500/10 text-sm font-bold text-violet-100 transition active:scale-95 active:bg-violet-500/25"
                  >
                    {pct === 100 ? "MAX" : `${pct}%`}
                  </button>
                ))}
              </div>

              {side === "sell" && amountNum > 0 && livePrice > 0 && (
                <p className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-100">
                  Receive ≈ {formatUsd(amountNum * livePrice)} USDC
                </p>
              )}

              {quote && (
                <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white/85">
                  <p>{quote.label}</p>
                  {"pnlUsd" in quote && quote.pnlUsd !== undefined && (
                    <p className={`mt-1 font-semibold ${quote.pnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      Est. P&L {formatUsd(quote.pnlUsd)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between text-xs text-cyan-100/80">
                <span>Arc network fee</span>
                <span className="font-semibold">~${feeUsd} USDC</span>
              </div>

              {isConnected ? (
                <Button
                  variant="nexus"
                  className="min-h-[48px] w-full text-base font-semibold"
                  onClick={executeDemoTrade}
                  disabled={loading || arcPending || amountNum <= 0}
                >
                  {loading || arcPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    `Confirm ${side === "buy" ? "Buy" : "Sell"}`
                  )}
                </Button>
              ) : (
                <p className="text-center text-sm text-white/60">Connect wallet on Arc Testnet to trade</p>
              )}

              {error && <p className="text-sm text-rose-300">{error}</p>}

              {lastTx && (
                <a
                  href={arcExplorerTx(lastTx.hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 text-sm font-medium text-emerald-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Arc Scan
                </a>
              )}

              <p className="text-center text-[11px] text-white/45">
                Demo fills · real Arc USDC fee tx · prices from DexScreener
              </p>
            </>
            ) : null}
          </>
        )}
      </div>
      </div>
    </NexusAgentWalletProvider>
  );
}

/** @deprecated use NexusTradeHub */
export const NexusDemoTradePanel = NexusTradeHub;
