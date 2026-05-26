"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ArrowDownUp, ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { filterTradableTokens } from "@/lib/token-filters";
import { formatUsd } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export function NexusAbSwap({ tokens }: { tokens: TrendingMarketToken[] }) {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { payArcFee, ensureArcNetwork, isPending: arcPending, feeUsd } = useArcSettlement();
  const tradable = useMemo(() => filterTradableTokens(tokens), [tokens]);

  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");
  const [amountA, setAmountA] = useState("10");
  const [loading, setLoading] = useState(false);

  const a = tradable.find((t) => t.tokenAddress === tokenA);
  const b = tradable.find((t) => t.tokenAddress === tokenB);

  const amountNum = Math.max(0, Number(amountA) || 0);
  const estB =
    a && b && a.priceUsd > 0 && b.priceUsd > 0 ? (amountNum * a.priceUsd) / b.priceUsd : 0;

  async function executeSwap() {
    if (!a || !b || !address) {
      toast({ type: "error", title: "Select tokens", message: "Pick token A and token B" });
      return;
    }
    if (a.tokenAddress.toLowerCase() === b.tokenAddress.toLowerCase()) {
      toast({ type: "error", title: "Same token", message: "Choose two different tokens" });
      return;
    }
    if (amountNum <= 0) {
      toast({ type: "error", title: "Amount", message: "Enter amount of token A" });
      return;
    }

    setLoading(true);
    try {
      await ensureArcNetwork();
      const fee = await payArcFee("SWAP_AB", `${a.tokenAddress}-${b.tokenAddress}-${Date.now()}`);

      const sellRes = await fetch("/api/nexus/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          side: "sell",
          symbol: a.symbol,
          tokenAddress: a.tokenAddress,
          sourceChain: a.chainId,
          tradeNetwork: "arc",
          tokenAmount: amountNum,
          priceUsd: a.priceUsd,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const sellData = await sellRes.json();
      if (!sellRes.ok) throw new Error(sellData.error ?? "Sell leg failed");

      const usdcOut = sellData.trade?.usdcAmount ?? amountNum * a.priceUsd;
      const buyRes = await fetch("/api/nexus/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          side: "buy",
          symbol: b.symbol,
          tokenAddress: b.tokenAddress,
          sourceChain: b.chainId,
          tradeNetwork: "arc",
          usdcAmount: usdcOut,
          priceUsd: b.priceUsd,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const buyData = await buyRes.json();
      if (!buyRes.ok) throw new Error(buyData.error ?? "Buy leg failed");

      toast({
        type: "success",
        title: "Swap recorded",
        message: `Sold ${amountNum} ${a.symbol} → bought ~${(buyData.trade?.tokenAmount ?? estB).toFixed(4)} ${b.symbol} (demo on Arc)`,
      });
    } catch (e) {
      toast({
        type: "error",
        title: "Swap failed",
        message: e instanceof Error ? e.message : "Could not complete swap",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/8 to-violet-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ArrowDownUp className="h-5 w-5 text-cyan-200" />
        <div>
          <p className="text-sm font-semibold text-white">Token swap (A → B)</p>
          <p className="text-[11px] text-white/50">
            Demo swap on Arc portfolio — sell A, buy B with USDC notional (~${feeUsd} fee)
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/45">From (A)</label>
          <select
            value={tokenA}
            onChange={(e) => setTokenA(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white"
          >
            <option value="">Select token</option>
            {tradable.map((t) => (
              <option key={t.tokenAddress} value={t.tokenAddress}>
                {t.symbol} · {formatUsd(t.priceUsd)}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            placeholder="Amount A"
            className="mt-2 w-full min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 text-white"
          />
        </div>

        <div className="hidden justify-center sm:flex sm:pb-3">
          <ArrowRight className="h-6 w-6 text-cyan-300/70" />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/45">To (B)</label>
          <select
            value={tokenB}
            onChange={(e) => setTokenB(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white"
          >
            <option value="">Select token</option>
            {tradable.map((t) => (
              <option key={t.tokenAddress} value={t.tokenAddress}>
                {t.symbol} · {formatUsd(t.priceUsd)}
              </option>
            ))}
          </select>
          {a && b && amountNum > 0 && (
            <p className="mt-2 text-xs text-cyan-100/80">
              ≈ {estB.toFixed(6)} {b.symbol} ({formatUsd(amountNum * a.priceUsd)} notional)
            </p>
          )}
        </div>
      </div>

      {isConnected ? (
        <Button
          variant="nexus"
          className="mt-3 min-h-[48px] w-full"
          disabled={loading || arcPending || !a || !b}
          onClick={() => void executeSwap()}
        >
          {loading || arcPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Swap {a?.symbol ?? "A"} → {b?.symbol ?? "B"}
        </Button>
      ) : (
        <p className="mt-3 text-center text-xs text-white/50">Connect wallet on Arc to swap</p>
      )}

      {a?.url && (
        <a
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center justify-center gap-1 text-[11px] text-white/45 hover:text-cyan-200"
        >
          View pair on DexScreener <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
