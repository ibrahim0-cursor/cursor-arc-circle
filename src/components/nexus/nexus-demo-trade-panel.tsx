"use client";

import { useEffect, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { ArrowDownUp, ExternalLink, Loader2, TrendingDown, TrendingUp } from "lucide-react";
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
  const [amount, setAmount] = useState("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ hash: string; block?: number } | null>(null);
  const [position, setPosition] = useState<DemoPosition | null>(null);

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
    position && livePrice > 0
      ? position.tokenAmount * livePrice - position.usdcSpent
      : null;
  const unrealizedPct =
    position && position.usdcSpent > 0 && unrealizedPnl != null
      ? (unrealizedPnl / position.usdcSpent) * 100
      : null;

  const quote = trade
    ? buildDemoQuote({
        side,
        usdcAmount: side === "buy" ? Number(amount) : undefined,
        tokenAmount: side === "sell" ? Number(amount) : undefined,
        priceUsd: livePrice,
        position,
      })
    : null;

  const balanceLabel = balance
    ? `${Number(balance.formatted).toFixed(2)} ${balance.symbol}`
    : "—";

  async function executeDemoTrade() {
    if (!trade || !address) return;
    setLoading(true);
    setError(null);
    try {
      await ensureArcNetwork();
      const fee = await payArcFee(
        side.toUpperCase(),
        `${trade.tokenAddress}-${TRADE_NETWORK}-${side}-${amount}-${Date.now()}`,
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
          usdcAmount: side === "buy" ? Number(amount) : undefined,
          tokenAmount: side === "sell" ? Number(amount) : undefined,
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

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-300/20 bg-white/[0.03] shadow-[0_0_40px_-12px_rgba(103,232,249,0.35)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-cyan-300/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <ArrowDownUp className="h-4 w-4 text-cyan-200" />
          <span className="text-sm font-medium text-cyan-50">Arc Swap</span>
        </div>
        {address && (
          <a
            href={arcExplorerAddress(address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-400/20"
          >
            {balanceLabel}
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        )}
      </div>

      <div className="space-y-3 p-4">
        {!trade ? (
          <p className="text-sm text-white/50">Select a token to swap on Arc.</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-white">{trade.symbol}</span>
              <span className="text-white/50">{formatUsd(livePrice)} live</span>
            </div>

            {position && position.tokenAmount > 0 && unrealizedPnl != null && (
              <div
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                  unrealizedPnl >= 0
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                    : "border-rose-400/25 bg-rose-400/10 text-rose-200"
                }`}
              >
                <span>
                  {position.tokenAmount.toFixed(4)} {trade.symbol} · entry {formatUsd(position.avgEntryUsd)}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  {unrealizedPnl >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {formatUsd(unrealizedPnl)}
                  {unrealizedPct != null && ` (${formatPct(unrealizedPct)})`}
                </span>
              </div>
            )}

            <div className="flex gap-1.5">
              {(["buy", "sell", "swap_to_usdc"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSide(value)}
                  disabled={value === "swap_to_usdc" && (!position || position.tokenAmount <= 0)}
                  className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium capitalize transition ${
                    side === value
                      ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-100"
                      : "border-white/10 bg-white/[0.02] text-white/55 disabled:opacity-40"
                  }`}
                >
                  {value === "swap_to_usdc" ? "→ USDC" : value}
                </button>
              ))}
            </div>

            {side !== "swap_to_usdc" && (
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-cyan-300/15 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
                placeholder={side === "buy" ? "USDC amount" : "Token amount"}
              />
            )}

            {quote && (
              <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs text-white/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{quote.label}</span>
                  {"pnlUsd" in quote && quote.pnlUsd !== undefined && (
                    <span className={quote.pnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}>
                      P&L {formatUsd(quote.pnlUsd)}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-cyan-300/10 bg-cyan-400/[0.04] px-3 py-2 text-[11px] text-cyan-100/75">
              <span>Arc fee</span>
              <span className="font-medium text-cyan-200">~${feeUsd} USDC</span>
            </div>

            {isConnected ? (
              <Button
                variant="nexus"
                className="h-9 w-full text-sm"
                onClick={executeDemoTrade}
                disabled={loading || arcPending}
              >
                {loading || arcPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Confirm · ${side === "buy" ? "Buy" : side === "sell" ? "Sell" : "Swap"}`
                )}
              </Button>
            ) : (
              <p className="text-center text-xs text-white/50">Connect on Arc Testnet</p>
            )}

            {error && <p className="text-xs text-rose-300">{error}</p>}

            {lastTx && (
              <a
                href={arcExplorerTx(lastTx.hash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-400/15"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Arc Scan · {truncateHash(lastTx.hash, 8, 6)}
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
