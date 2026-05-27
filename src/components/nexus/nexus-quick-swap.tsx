"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ArrowDownUp, ChevronDown, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { filterTradableTokens } from "@/lib/token-filters";
import type { DemoPosition } from "@/lib/storage";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

const PCT_OPTIONS = [25, 50, 75, 100] as const;

function TokenPicker({
  label,
  value,
  onChange,
  tokens,
  balanceHint,
  showBalanceOnly,
}: {
  label: string;
  value: string;
  onChange: (addr: string) => void;
  tokens: TrendingMarketToken[];
  balanceHint?: string;
  showBalanceOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = tokens.find((t) => t.tokenAddress === value);

  return (
    <div className="relative">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex w-full min-h-[48px] items-center gap-2.5 rounded-xl border border-white/15 bg-black/45 px-3 text-left transition hover:border-cyan-400/35"
      >
        <NexusTokenAvatar symbol={selected?.symbol ?? "?"} icon={selected?.icon} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {selected ? selected.symbol : "Select token"}
          </p>
          <p className="truncate text-[11px] text-white/50">
            {balanceHint ?? (selected?.name && selected.name !== selected.symbol ? selected.name : "—")}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/15 bg-[#0a1220] py-1 shadow-xl">
          {tokens.map((t) => (
            <button
              key={t.tokenAddress}
              type="button"
              onClick={() => {
                onChange(t.tokenAddress);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5"
            >
              <NexusTokenAvatar symbol={t.symbol} icon={t.icon} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{t.symbol}</p>
                {!showBalanceOnly && t.name !== t.symbol && (
                  <p className="truncate text-[10px] text-white/45">{t.name}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NexusQuickSwap({
  tokens,
  onComplete,
}: {
  tokens: TrendingMarketToken[];
  onComplete?: () => void;
}) {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { payArcFee, ensureArcNetwork, isPending: arcPending, feeUsd } = useArcSettlement();
  const tradable = useMemo(() => filterTradableTokens(tokens), [tokens]);

  const [payToken, setPayToken] = useState("");
  const [receiveToken, setReceiveToken] = useState("");
  const [amount, setAmount] = useState("");
  const [amountMode, setAmountMode] = useState<"token" | "usdc">("token");
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<DemoPosition[]>([]);

  const loadPortfolio = useCallback(async () => {
    if (!address) return;
    const res = await fetch(`/api/nexus/demo/portfolio?wallet=${address}&t=${Date.now()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) setPositions(data.positions ?? []);
  }, [address]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  const heldKeys = useMemo(
    () =>
      new Set(
        positions.filter((p) => p.tokenAmount > 0).map((p) => p.tokenAddress.toLowerCase()),
      ),
    [positions],
  );

  const sortedTradable = useMemo(() => {
    return [...tradable].sort((a, b) => {
      const ah = heldKeys.has(a.tokenAddress.toLowerCase()) ? 1 : 0;
      const bh = heldKeys.has(b.tokenAddress.toLowerCase()) ? 1 : 0;
      return bh - ah;
    });
  }, [tradable, heldKeys]);

  const payOptions = useMemo(() => {
    const held = sortedTradable.filter((t) => heldKeys.has(t.tokenAddress.toLowerCase()));
    return held.length > 0 ? held : sortedTradable.slice(0, 20);
  }, [sortedTradable, heldKeys]);

  useEffect(() => {
    if (!payToken && payOptions[0]) setPayToken(payOptions[0].tokenAddress);
    if (!receiveToken) {
      const next = sortedTradable.find(
        (t) => t.tokenAddress.toLowerCase() !== payToken.toLowerCase(),
      );
      if (next) setReceiveToken(next.tokenAddress);
    }
  }, [payOptions, sortedTradable, payToken, receiveToken]);

  const pay = sortedTradable.find((t) => t.tokenAddress === payToken) ?? payOptions[0];
  const receive = sortedTradable.find((t) => t.tokenAddress === receiveToken);
  const posPay = positions.find((p) => p.tokenAddress.toLowerCase() === payToken.toLowerCase());
  const balancePay = posPay?.tokenAmount ?? 0;

  const amountNum = Math.max(0, Number(amount) || 0);
  const tokenAmountSell =
    amountMode === "usdc" && pay && pay.priceUsd > 0 ? amountNum / pay.priceUsd : amountNum;
  const estReceive =
    pay && receive && pay.priceUsd > 0 && receive.priceUsd > 0
      ? (tokenAmountSell * pay.priceUsd) / receive.priceUsd
      : 0;

  function applyPct(pct: number) {
    if (amountMode === "token") {
      if (balancePay <= 0) {
        toast({ type: "error", title: "No balance", message: `You hold 0 ${pay?.symbol ?? "token"}` });
        return;
      }
      setAmount(((balancePay * pct) / 100).toFixed(pct === 100 ? 6 : 4));
      return;
    }
    const maxUsdc = balancePay * (pay?.priceUsd ?? 0);
    if (maxUsdc <= 0) {
      toast({ type: "error", title: "No balance", message: "Select a token you hold" });
      return;
    }
    setAmount(((maxUsdc * pct) / 100).toFixed(2));
  }

  async function executeSwap() {
    if (!pay || !receive || !address) {
      toast({ type: "error", title: "Select tokens", message: "Pick pay and receive tokens" });
      return;
    }
    if (pay.tokenAddress.toLowerCase() === receive.tokenAddress.toLowerCase()) {
      toast({ type: "error", title: "Same token", message: "Choose two different tokens" });
      return;
    }
    if (tokenAmountSell <= 0) {
      toast({ type: "error", title: "Amount", message: "Enter a valid amount" });
      return;
    }
    if (tokenAmountSell > balancePay + 1e-9) {
      toast({
        type: "error",
        title: "Insufficient balance",
        message: `You have ${balancePay.toFixed(4)} ${pay.symbol}`,
      });
      return;
    }

    setLoading(true);
    try {
      await ensureArcNetwork();
      const fee = await payArcFee("SWAP", `${pay.tokenAddress}-${receive.tokenAddress}-${Date.now()}`);

      const sellRes = await fetch("/api/nexus/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          side: "sell",
          symbol: pay.symbol,
          tokenAddress: pay.tokenAddress,
          sourceChain: pay.chainId,
          tradeNetwork: "arc",
          tokenAmount: tokenAmountSell,
          priceUsd: pay.priceUsd,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const sellData = await sellRes.json();
      if (!sellRes.ok) throw new Error(sellData.error ?? "Sell leg failed");

      const usdcOut = sellData.trade?.usdcAmount ?? tokenAmountSell * pay.priceUsd;
      const buyRes = await fetch("/api/nexus/demo/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          side: "buy",
          symbol: receive.symbol,
          tokenAddress: receive.tokenAddress,
          sourceChain: receive.chainId,
          tradeNetwork: "arc",
          usdcAmount: usdcOut,
          priceUsd: receive.priceUsd,
          arcFeeTxHash: fee.txHash,
        }),
      });
      const buyData = await buyRes.json();
      if (!buyRes.ok) throw new Error(buyData.error ?? "Buy leg failed");

      toast({
        type: "success",
        title: "Swap complete",
        message: `${tokenAmountSell.toFixed(4)} ${pay.symbol} → ~${(buyData.trade?.tokenAmount ?? estReceive).toFixed(4)} ${receive.symbol}`,
      });
      await loadPortfolio();
      onComplete?.();
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
    <section className="nexus-section-card space-y-3 rounded-2xl border border-violet-400/20 bg-black/25 p-3">
      <div className="flex items-center gap-2">
        <ArrowDownUp className="h-4 w-4 text-violet-300" />
        <div>
          <p className="text-sm font-semibold text-white">Quick swap</p>
          <p className="text-[10px] text-white/45">Sell what you hold · buy another token · ~${feeUsd} Arc fee</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TokenPicker
          label="You pay"
          value={payToken}
          onChange={setPayToken}
          tokens={payOptions}
          balanceHint={
            pay && balancePay > 0
              ? `Balance ${balancePay.toFixed(4)} ${pay.symbol}`
              : pay
                ? "No balance — buy first"
                : undefined
          }
          showBalanceOnly
        />
        <TokenPicker
          label="You receive"
          value={receiveToken}
          onChange={setReceiveToken}
          tokens={sortedTradable.filter((t) => t.tokenAddress !== payToken)}
          showBalanceOnly
        />
      </div>

      {pay && (
        <p className="flex items-center gap-1.5 text-[11px] text-white/55">
          <Wallet className="h-3.5 w-3.5 text-cyan-300/80" />
          Available: <strong className="text-white">{balancePay.toFixed(4)}</strong> {pay.symbol}
        </p>
      )}

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">Amount</span>
          <div className="inline-flex rounded-lg border border-white/15 p-0.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setAmountMode("token")}
              className={`rounded-md px-2.5 py-1 transition ${
                amountMode === "token" ? "bg-cyan-500/25 text-cyan-100" : "text-white/50"
              }`}
            >
              {pay?.symbol ?? "Token"}
            </button>
            <button
              type="button"
              onClick={() => setAmountMode("usdc")}
              className={`rounded-md px-2.5 py-1 transition ${
                amountMode === "usdc" ? "bg-emerald-500/25 text-emerald-100" : "text-white/50"
              }`}
            >
              USDC
            </button>
          </div>
        </div>

        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={amountMode === "usdc" ? "USDC amount" : "Token amount"}
          className="w-full min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 text-lg font-medium text-white outline-none focus:border-cyan-400/40"
        />

        <div className="mt-2 grid grid-cols-5 gap-1.5">
          <button
            type="button"
            onClick={() => applyPct(100)}
            className="min-h-[36px] rounded-lg border border-violet-400/30 bg-violet-500/15 text-xs font-bold text-violet-100"
          >
            MAX
          </button>
          {PCT_OPTIONS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => applyPct(pct)}
              className="min-h-[36px] rounded-lg border border-white/12 bg-white/5 text-xs font-semibold text-white/75 hover:bg-white/10"
            >
              {pct}%
            </button>
          ))}
        </div>

        {pay && receive && amountNum > 0 && (
          <p className="mt-2 text-xs text-cyan-100/85">
            ≈ {tokenAmountSell.toFixed(4)} {pay.symbol} → {estReceive.toFixed(4)} {receive.symbol}
          </p>
        )}
      </div>

      {isConnected ? (
        <Button
          variant="nexus"
          className="min-h-[48px] w-full"
          disabled={loading || arcPending || !pay || !receive || balancePay <= 0}
          onClick={() => void executeSwap()}
        >
          {loading || arcPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Swap {pay?.symbol ?? "—"} → {receive?.symbol ?? "—"}
        </Button>
      ) : (
        <p className="text-center text-xs text-white/50">Connect wallet (top right) to swap</p>
      )}
    </section>
  );
}
