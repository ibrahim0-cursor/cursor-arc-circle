"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import {
  ArrowDownUp,
  ArrowRightLeft,
  ExternalLink,
  Loader2,
  Percent,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function NexusDemoTradePanel({
  token,
  onTradeComplete,
}: {
  token: TradeToken;
  onTradeComplete?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { payArcFee, ensureArcNetwork, isPending: arcPending, feeUsd } = useArcSettlement();
  const { data: balance } = useBalance({ address, chainId: ARC_TESTNET_ID });

  const trade = asTradeToken(token);
  const [side, setSide] = useState<"buy" | "sell" | "swap_to_usdc">("buy");
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
  }, [address, trade?.tokenAddress, lastTx, trade?.priceUsd]);

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
    if (side === "swap_to_usdc" && pct === 100) {
      setAmount(formatAmount(tokenBalance));
    }
  }

  function applyBuyPreset(usdc: number) {
    setSide("buy");
    setAmount(String(usdc));
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
          tokenAmount: side === "sell" || side === "swap_to_usdc" ? amountNum : undefined,
          priceUsd: livePrice,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo trade failed");

      setLastTx({ hash: fee.txHash, block: fee.blockNumber });
      onTradeComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade failed");
    } finally {
      setLoading(false);
    }
  }

  const balanceLabel = balance
    ? `${Number(balance.formatted).toFixed(2)} ${balance.symbol}`
    : "—";

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-300/25 bg-white/[0.04] shadow-[0_0_32px_-8px_rgba(103,232,249,0.4)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-300/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <ArrowDownUp className="h-5 w-5 text-cyan-200" />
          <span className="text-base font-semibold text-cyan-50">Trade on Arc</span>
        </div>
        {address && (
          <a
            href={arcExplorerAddress(address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-100"
          >
            {balanceLabel}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="space-y-4 p-4">
        {!trade ? (
          <p className="text-center text-sm text-white/60">Select a token from the feed to trade.</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2.5">
              <span className="text-lg font-bold text-white">{trade.symbol}</span>
              <span className="text-sm text-white/70">{formatUsd(livePrice)}</span>
            </div>

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

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "buy" as const, label: "Buy", icon: TrendingUp },
                  { value: "sell" as const, label: "Sell", icon: TrendingDown },
                  { value: "swap_to_usdc" as const, label: "Max USDC", icon: ArrowRightLeft },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSide(value);
                    if (value === "swap_to_usdc") setAmount(formatAmount(tokenBalance));
                  }}
                  disabled={value === "swap_to_usdc" && tokenBalance <= 0}
                  className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border text-sm font-semibold transition active:scale-[0.98] ${
                    side === value
                      ? value === "buy"
                        ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                        : value === "sell"
                          ? "border-rose-400/50 bg-rose-500/20 text-rose-100"
                          : "border-cyan-400/50 bg-cyan-500/20 text-cyan-100"
                      : "border-white/12 bg-white/[0.03] text-white/65"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {side === "buy" && (
              <div>
                <p className="nexus-caption mb-2">Quick USDC</p>
                <div className="grid grid-cols-4 gap-2">
                  {BUY_PRESETS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => applyBuyPreset(v)}
                      className="min-h-[40px] rounded-lg border border-white/12 bg-white/5 text-sm font-medium text-white/90 active:bg-white/15"
                    >
                      ${v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {side !== "swap_to_usdc" && (
              <>
                <p className="nexus-caption flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-violet-300" />
                  {side === "buy" ? "Amount (USDC)" : `Amount (${trade.symbol})`} · tap % of balance
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
                      className="min-h-[44px] rounded-xl border border-violet-400/25 bg-violet-500/10 text-sm font-bold text-violet-100 active:bg-violet-500/25"
                    >
                      {pct === 100 ? "MAX" : `${pct}%`}
                    </button>
                  ))}
                </div>
              </>
            )}

            {side === "swap_to_usdc" && (
              <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                Sells your full position ({tokenBalance.toFixed(4)} {trade.symbol}) for Arc USDC.
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
                  `Confirm ${side === "buy" ? "Buy" : side === "sell" ? "Sell" : "Swap to USDC"}`
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
        )}
      </div>
    </div>
  );
}
