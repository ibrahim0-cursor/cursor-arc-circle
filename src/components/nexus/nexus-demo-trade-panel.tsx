"use client";

import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ArrowDownUp, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WalletConnectButton } from "@/components/nexus/wallet-connect-button";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { buildDemoQuote } from "@/lib/demo-trading";
import {
  DEMO_TRADE_NETWORKS,
  mirrorTestnetForSource,
  type DemoTradeNetworkId,
} from "@/lib/testnet-chains";
import { arcExplorerTx } from "@/lib/arc";
import { formatUsd } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import type { NexusDecision } from "@/lib/storage";

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

export function NexusDemoTradePanel({
  token,
  onTradeComplete,
}: {
  token: TradeToken;
  onTradeComplete?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { payArcFee, ensureArcNetwork, isPending: arcPending, feeUsd } = useArcSettlement();

  const trade = asTradeToken(token);
  const defaultNetwork = trade
    ? (mirrorTestnetForSource(trade.chainId) as DemoTradeNetworkId)
    : "arc";

  const [tradeNetwork, setTradeNetwork] = useState<DemoTradeNetworkId>(defaultNetwork);
  const [side, setSide] = useState<"buy" | "sell" | "swap_to_usdc">("buy");
  const [amount, setAmount] = useState("50");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [positionTokens, setPositionTokens] = useState(0);

  useEffect(() => {
    if (trade) setTradeNetwork(mirrorTestnetForSource(trade.chainId) as DemoTradeNetworkId);
  }, [trade?.tokenAddress, trade?.chainId]);

  useEffect(() => {
    async function loadPosition() {
      if (!address || !trade) return;
      const res = await fetch(`/api/nexus/demo/portfolio?wallet=${address}`);
      const data = await res.json();
      const pos = (data.positions ?? []).find(
        (p: { tokenAddress: string; tradeNetwork: string }) =>
          p.tokenAddress.toLowerCase() === trade.tokenAddress.toLowerCase() &&
          p.tradeNetwork === tradeNetwork,
      );
      setPositionTokens(pos?.tokenAmount ?? 0);
    }
    loadPosition();
  }, [address, trade, tradeNetwork, lastTx]);

  const quote = trade
    ? buildDemoQuote({
        side,
        usdcAmount: side === "buy" ? Number(amount) : undefined,
        tokenAmount: side === "sell" ? Number(amount) : undefined,
        priceUsd: trade.priceUsd,
        position:
          positionTokens > 0
            ? {
                id: "",
                wallet: address ?? "",
                symbol: trade.symbol,
                tokenAddress: trade.tokenAddress,
                sourceChain: trade.chainId,
                tradeNetwork,
                tokenAmount: positionTokens,
                avgEntryUsd: trade.priceUsd,
                usdcSpent: positionTokens * trade.priceUsd,
                priceUsd: trade.priceUsd,
                createdAt: "",
                updatedAt: "",
                arcFeeTxHashes: [],
              }
            : null,
      })
    : null;

  async function executeDemoTrade() {
    if (!trade || !address) return;
    setLoading(true);
    setError(null);
    try {
      await ensureArcNetwork();
      const fee = await payArcFee(
        side.toUpperCase(),
        `${trade.tokenAddress}-${tradeNetwork}-${side}-${amount}`,
      );

      const network = DEMO_TRADE_NETWORKS.find((n) => n.id === tradeNetwork)!;
      if (side !== "buy") {
        await switchChainAsync({ chainId: network.chainId }).catch(() => undefined);
      }

      const res = await fetch("/api/nexus/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          side,
          symbol: trade.symbol,
          tokenAddress: trade.tokenAddress,
          sourceChain: trade.chainId,
          tradeNetwork,
          usdcAmount: side === "buy" ? Number(amount) : undefined,
          tokenAmount: side === "sell" ? Number(amount) : undefined,
          priceUsd: trade.priceUsd,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo trade failed");

      setLastTx(fee.txHash);
      onTradeComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade failed");
    } finally {
      setLoading(false);
    }
  }

  const networkMeta = DEMO_TRADE_NETWORKS.find((n) => n.id === tradeNetwork);

  return (
    <Card className="border-cyan-400/25 bg-gradient-to-b from-cyan-400/[0.06] to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-cyan-300" />
            <div>
              <h2 className="text-lg font-medium">Demo Trading</h2>
              <p className="text-xs text-white/45">Live prices · testnet execution · Arc USDC fees</p>
            </div>
          </div>
          <WalletConnectButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!trade ? (
          <p className="text-sm text-white/50">Select a trending token to demo trade.</p>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">Token</p>
                  <p className="mt-1 text-xl font-semibold">{trade.symbol}</p>
                  <p className="text-xs text-white/45">{formatUsd(trade.priceUsd)} · {trade.chainId} feed</p>
                </div>
                <Badge variant="nexus">Demo</Badge>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">Trade network (testnet)</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DEMO_TRADE_NETWORKS.map((network) => (
                  <button
                    key={network.id}
                    type="button"
                    onClick={() => setTradeNetwork(network.id)}
                    className={`rounded-xl border py-2 text-xs font-medium transition ${
                      tradeNetwork === network.id
                        ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100"
                        : "border-white/10 bg-white/[0.03] text-white/55"
                    }`}
                  >
                    {network.short}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-white/40">
                Suggested: <strong className="text-white/60">{networkMeta?.label}</strong> mirrors {trade.chainId} ·
                all fees paid in Arc USDC (~${feeUsd})
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["buy", "sell", "swap_to_usdc"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSide(value)}
                  disabled={value === "swap_to_usdc" && positionTokens <= 0}
                  className={`rounded-xl border py-2.5 text-xs font-medium capitalize transition ${
                    side === value
                      ? value === "buy"
                        ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                        : "border-rose-400/40 bg-rose-400/15 text-rose-200"
                      : "border-white/10 bg-white/[0.03] text-white/60 disabled:opacity-40"
                  }`}
                >
                  {value === "swap_to_usdc" ? "→ Arc USDC" : value}
                </button>
              ))}
            </div>

            {side !== "swap_to_usdc" && (
              <div>
                <label className="text-xs uppercase tracking-[0.18em] text-white/40">
                  {side === "buy" ? "Demo USDC amount" : "Token amount"}
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                />
              </div>
            )}

            {positionTokens > 0 && (
              <p className="text-xs text-cyan-200/70">
                Open position: {positionTokens.toFixed(6)} {trade.symbol} on {networkMeta?.short}
              </p>
            )}

            {quote && (
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100/90">
                {quote.label}
                {"pnlUsd" in quote && quote.pnlUsd !== undefined && (
                  <span className={`ml-2 ${quote.pnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    (P&L {formatUsd(quote.pnlUsd)})
                  </span>
                )}
              </div>
            )}

            {isConnected ? (
              <Button
                variant="nexus"
                className="w-full"
                onClick={executeDemoTrade}
                disabled={loading || arcPending}
              >
                {loading || arcPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Pay Arc USDC Fee & {side === "buy" ? "Buy" : side === "sell" ? "Sell" : "Swap to USDC"}
              </Button>
            ) : (
              <p className="text-sm text-white/55">Connect on Arc Testnet to demo trade.</p>
            )}

            {error && <p className="text-sm text-rose-300">{error}</p>}
            {lastTx && (
              <a
                href={arcExplorerTx(lastTx)}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-emerald-300 hover:underline"
              >
                Arc fee tx · {lastTx.slice(0, 14)}…
              </a>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
