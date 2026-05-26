"use client";

import { useState } from "react";
import { WalletConnectButton } from "@/components/nexus/wallet-connect-button";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { ArrowDownUp, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { jupiterSwapUrl, zeroXSwapUrl } from "@/lib/dexscreener";
import { evmChainId, isEvmChain } from "@/lib/swap";
import type { NexusDecision } from "@/lib/storage";

export function NexusSwapPanel({ decision }: { decision: NexusDecision | null }) {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("25");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{
    demo?: boolean;
    message?: string;
    transaction?: { to?: `0x${string}`; data?: `0x${string}`; value?: string };
    jupiterUrl?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { sendTransaction, data: txHash, isPending } = useSendTransaction();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  async function getQuote() {
    if (!decision || !address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/nexus/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: decision.chainId,
          buyToken: decision.token,
          sellAmount: amount,
          taker: address,
          side,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote failed");
      setQuote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  async function executeSwap() {
    if (!quote || quote.demo) return;
    const tx = quote.transaction;
    if (!tx?.to || !tx?.data) {
      setError("No executable transaction in quote");
      return;
    }
    sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value ? BigInt(tx.value) : undefined,
    });
  }

  const externalSwapUrl = decision
    ? decision.chainId === "solana"
      ? jupiterSwapUrl(decision.token)
      : evmChainId(decision.chainId)
        ? zeroXSwapUrl(evmChainId(decision.chainId)!, decision.token)
        : decision.dexUrl
    : "#";

  return (
    <Card className="border-cyan-400/25 bg-gradient-to-b from-cyan-400/[0.06] to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-medium">Swap & Execute</h2>
          </div>
          <WalletConnectButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!decision ? (
          <p className="text-sm text-white/50">Select a token from the feed to swap.</p>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">Target</p>
                  <p className="mt-1 text-lg font-semibold">{decision.symbol}</p>
                </div>
                <Badge variant={decision.action === "BUY" ? "buy" : decision.action === "SELL" ? "sell" : "hold"}>
                  Agent: {decision.action}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["buy", "sell"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSide(value)}
                  className={`rounded-xl border py-2.5 text-sm font-medium capitalize transition ${
                    side === value
                      ? value === "buy"
                        ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                        : "border-rose-400/40 bg-rose-400/15 text-rose-200"
                      : "border-white/10 bg-white/[0.03] text-white/60"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.18em] text-white/40">
                {side === "buy" ? "USDC amount" : "Token amount"}
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>

            {isConnected ? (
              <div className="space-y-2">
                <Button variant="nexus" className="w-full" onClick={getQuote} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Get Swap Quote
                </Button>
                {quote && !quote.demo && (
                  <Button variant="outline" className="w-full" onClick={executeSwap} disabled={isPending || confirming}>
                    {isPending || confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Confirm {side.toUpperCase()} on-chain
                  </Button>
                )}
                {quote?.demo === true && (
                  <p className="text-xs text-amber-200/80">
                    {quote.message ?? "Use external swap for this chain."}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/55">Connect wallet to quote and execute swaps.</p>
            )}

            {error && <p className="text-sm text-rose-300">{error}</p>}
            {txHash && (
              <p className="break-all text-xs text-emerald-300">Tx submitted: {txHash}</p>
            )}

            <a
              href={externalSwapUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm text-white/70 transition hover:bg-white/5"
            >
              {decision.chainId === "solana" ? "Swap on Jupiter" : "Open DEX Swap"}
              <ExternalLink className="h-4 w-4" />
            </a>

            {!isEvmChain(decision.chainId) && (
              <p className="text-xs leading-6 text-white/45">
                Solana tokens use Jupiter. Connect Phantom via browser extension, then use the Jupiter link above.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
