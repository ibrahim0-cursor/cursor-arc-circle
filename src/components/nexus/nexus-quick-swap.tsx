"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { CheckCircle2, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useArcSettlement } from "@/hooks/use-arc-settlement";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { ARC_TESTNET_ID } from "@/lib/arc-chain";
import { arcExplorerTx } from "@/lib/arc";
import {
  createArcUsdcSwapToken,
  isArcNativeUsdc,
  mergeSwapTokenList,
} from "@/lib/arc-usdc-swap";
import type { DemoPosition, DemoTradeRecord } from "@/lib/storage";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

const PCT_OPTIONS = [25, 50, 75, 100] as const;

type SwapSuccessState = {
  summary: string;
  feeTxHash: string;
  legs: string[];
  trades: DemoTradeRecord[];
};

function TokenPicker({
  label,
  value,
  onChange,
  tokens,
  balanceHint,
}: {
  label: string;
  value: string;
  onChange: (addr: string) => void;
  tokens: TrendingMarketToken[];
  balanceHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = tokens.find(
    (t) => t.tokenAddress.toLowerCase() === value.toLowerCase(),
  );

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
          <p className="truncate text-[11px] text-white/50">{balanceHint ?? selected?.name ?? "—"}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/15 bg-[#0a1220] py-1 shadow-xl">
          {tokens.length === 0 ? (
            <p className="px-3 py-3 text-xs text-white/50">No tokens in roster yet.</p>
          ) : (
            tokens.map((t) => (
              <button
                key={`${t.chainId}:${t.tokenAddress}`}
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
                  <p className="truncate text-[10px] text-white/45">
                    {t.name !== t.symbol ? t.name : t.chainId}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function NexusQuickSwap({
  tokens,
  alphaTokens,
  onComplete,
}: {
  tokens: TrendingMarketToken[];
  alphaTokens?: Array<{
    symbol: string;
    name: string;
    tokenAddress: string;
    chainId: string;
    priceUsd: number;
    change24h: number;
    icon?: string;
  }>;
  onComplete?: () => void;
}) {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { data: walletBalance } = useBalance({ address, chainId: ARC_TESTNET_ID });
  const { payArcFee, ensureArcNetwork, isPending: arcPending, feeUsd } = useArcSettlement();

  const allTokens = useMemo(
    () => mergeSwapTokenList(tokens, alphaTokens),
    [tokens, alphaTokens],
  );

  const [payToken, setPayToken] = useState("");
  const [receiveToken, setReceiveToken] = useState("");
  const [amount, setAmount] = useState("");
  const [amountMode, setAmountMode] = useState<"token" | "usdc">("token");
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [recentTrades, setRecentTrades] = useState<DemoTradeRecord[]>([]);
  const [success, setSuccess] = useState<SwapSuccessState | null>(null);

  const walletUsdc = walletBalance ? Number(walletBalance.formatted) : 0;

  const loadPortfolio = useCallback(async () => {
    if (!address) return;
    const res = await fetch(`/api/nexus/demo/portfolio?wallet=${address}&t=${Date.now()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) {
      setPositions(data.positions ?? []);
      setRecentTrades((data.trades as DemoTradeRecord[])?.slice(0, 3) ?? []);
    }
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

  const sortedTokens = useMemo(() => {
    const usdc = createArcUsdcSwapToken();
    return [...allTokens].sort((a, b) => {
      const aUsdc = isArcNativeUsdc(a.tokenAddress) ? 2 : 0;
      const bUsdc = isArcNativeUsdc(b.tokenAddress) ? 2 : 0;
      if (aUsdc !== bUsdc) return bUsdc - aUsdc;
      const ah = heldKeys.has(a.tokenAddress.toLowerCase()) ? 1 : 0;
      const bh = heldKeys.has(b.tokenAddress.toLowerCase()) ? 1 : 0;
      if (ah !== bh) return bh - ah;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [allTokens, heldKeys]);

  const receiveOptions = useMemo(
    () =>
      sortedTokens.filter((t) => t.tokenAddress.toLowerCase() !== payToken.toLowerCase()),
    [sortedTokens, payToken],
  );

  useEffect(() => {
    if (!payToken && sortedTokens[0]) setPayToken(sortedTokens[0].tokenAddress);
  }, [sortedTokens, payToken]);

  useEffect(() => {
    if (!payToken) return;
    const needsReceive =
      !receiveToken || receiveToken.toLowerCase() === payToken.toLowerCase();
    if (!needsReceive) return;
    const next = receiveOptions[0];
    if (next) setReceiveToken(next.tokenAddress);
  }, [payToken, receiveToken, receiveOptions]);

  useEffect(() => {
    if (payToken && isArcNativeUsdc(payToken)) setAmountMode("usdc");
  }, [payToken]);

  const pay = sortedTokens.find((t) => t.tokenAddress.toLowerCase() === payToken.toLowerCase());
  const receive = sortedTokens.find(
    (t) => t.tokenAddress.toLowerCase() === receiveToken.toLowerCase(),
  );
  const payIsUsdc = pay ? isArcNativeUsdc(pay.tokenAddress) : false;
  const receiveIsUsdc = receive ? isArcNativeUsdc(receive.tokenAddress) : false;
  const sameToken =
    !!pay &&
    !!receive &&
    pay.tokenAddress.toLowerCase() === receive.tokenAddress.toLowerCase();

  const posPay = positions.find((p) => p.tokenAddress.toLowerCase() === payToken.toLowerCase());
  const balancePay = payIsUsdc ? walletUsdc : (posPay?.tokenAmount ?? 0);

  const amountNum = Math.max(0, Number(amount) || 0);
  const tokenAmountSell =
    payIsUsdc || amountMode === "usdc"
      ? pay && !payIsUsdc && pay.priceUsd > 0
        ? amountNum / pay.priceUsd
        : amountNum
      : amountNum;
  const usdcSpend = payIsUsdc
    ? amountNum
    : amountMode === "usdc"
      ? amountNum
      : tokenAmountSell * (pay?.priceUsd ?? 0);
  const estReceive =
    pay && receive
      ? receiveIsUsdc
        ? usdcSpend
        : pay.priceUsd > 0 && receive.priceUsd > 0
          ? payIsUsdc
            ? usdcSpend / receive.priceUsd
            : (tokenAmountSell * pay.priceUsd) / receive.priceUsd
          : 0
      : 0;

  function applyPct(pct: number) {
    if (payIsUsdc) {
      if (walletUsdc <= 0) {
        toast({ type: "error", title: "No USDC", message: "Fund wallet on Arc Testnet" });
        return;
      }
      setAmount(((walletUsdc * pct) / 100).toFixed(2));
      return;
    }
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
    if (sameToken) {
      toast({ type: "error", title: "Same token", message: "Choose two different tokens" });
      return;
    }
    if (usdcSpend <= 0 && tokenAmountSell <= 0) {
      toast({ type: "error", title: "Amount", message: "Enter a valid amount" });
      return;
    }
    if (payIsUsdc) {
      if (usdcSpend > walletUsdc + 1e-9) {
        toast({
          type: "error",
          title: "Insufficient USDC",
          message: `Wallet has ${walletUsdc.toFixed(2)} USDC`,
        });
        return;
      }
    } else if (tokenAmountSell > balancePay + 1e-9) {
      toast({
        type: "error",
        title: "Insufficient balance",
        message: `You have ${balancePay.toFixed(4)} ${pay.symbol}`,
      });
      return;
    }

    setLoading(true);
    setSuccess(null);
    const legs: string[] = [];
    let buyTrade: DemoTradeRecord | undefined;
    let sellTrade: DemoTradeRecord | undefined;

    try {
      await ensureArcNetwork();
      const fee = await payArcFee("SWAP", `${pay.tokenAddress}-${receive.tokenAddress}-${Date.now()}`);

      if (payIsUsdc && !receiveIsUsdc) {
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
            usdcAmount: usdcSpend,
            priceUsd: receive.priceUsd,
            arcFeeTxHash: fee.txHash,
          }),
        });
        const buyData = await buyRes.json();
        if (!buyRes.ok) throw new Error(buyData.error ?? "Buy failed");
        buyTrade = buyData.trade;
        legs.push(
          `Bought ~${(buyData.trade?.tokenAmount ?? estReceive).toFixed(4)} ${receive.symbol}`,
        );
      } else if (receiveIsUsdc && !payIsUsdc) {
        const sellRes = await fetch("/api/nexus/demo/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: address,
            side: "swap_to_usdc",
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
        if (!sellRes.ok) throw new Error(sellData.error ?? "Sell failed");
        sellTrade = sellData.trade;
        legs.push(
          `Sold ${tokenAmountSell.toFixed(4)} ${pay.symbol} → ~${(sellData.trade?.usdcAmount ?? usdcSpend).toFixed(2)} USDC`,
        );
      } else if (!payIsUsdc && !receiveIsUsdc) {
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
        sellTrade = sellData.trade;

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
        buyTrade = buyData.trade;
        legs.push(
          `Sold ${tokenAmountSell.toFixed(4)} ${pay.symbol}`,
          `Bought ~${(buyData.trade?.tokenAmount ?? estReceive).toFixed(4)} ${receive.symbol}`,
        );
      }

      const summary = receiveIsUsdc
        ? `${tokenAmountSell.toFixed(4)} ${pay.symbol} → ${usdcSpend.toFixed(2)} USDC`
        : payIsUsdc
          ? `${usdcSpend.toFixed(2)} USDC → ~${(buyTrade?.tokenAmount ?? estReceive).toFixed(4)} ${receive.symbol}`
          : `${tokenAmountSell.toFixed(4)} ${pay.symbol} → ~${(buyTrade?.tokenAmount ?? estReceive).toFixed(4)} ${receive.symbol}`;

      const trades = [sellTrade, buyTrade].filter(Boolean) as DemoTradeRecord[];

      setSuccess({
        summary,
        feeTxHash: fee.txHash,
        legs,
        trades,
      });
      setAmount("");

      toast({
        type: "success",
        title: "Swap complete",
        message: summary,
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

  const payBalanceLabel = payIsUsdc
    ? walletUsdc > 0
      ? `Wallet ${walletUsdc.toFixed(2)} USDC on Arc`
      : "No USDC — fund wallet on Arc Testnet"
    : balancePay > 0
      ? `Balance ${balancePay.toFixed(4)} ${pay?.symbol}`
      : pay
        ? `No ${pay.symbol} — buy or swap in first`
        : undefined;

  return (
    <section className="nexus-section-card arc-glass-card arc-glass-card-nexus arc-border-trace space-y-3 rounded-2xl p-3">
      <div className="flex items-center gap-2.5">
        <ArcIcon3d icon={NEXUS_TRADE_ICONS.swap} theme="nexus" size="sm" />
        <div>
          <p className="text-sm font-semibold text-white">Quick swap</p>
          <p className="text-[10px] text-white/45">
            {sortedTokens.length} tokens + Arc USDC · icons · ~${feeUsd} fee
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TokenPicker
          label="You pay"
          value={payToken}
          onChange={(addr) => {
            setPayToken(addr);
            setSuccess(null);
          }}
          tokens={sortedTokens}
          balanceHint={payBalanceLabel}
        />
        <TokenPicker
          label="You receive"
          value={receiveToken}
          onChange={(addr) => {
            setReceiveToken(addr);
            setSuccess(null);
          }}
          tokens={receiveOptions}
        />
      </div>

      {pay && (
        <p className="flex items-center gap-1.5 text-[11px] text-white/55">
          <NEXUS_TRADE_ICONS.wallet className="h-3.5 w-3.5 text-cyan-300/80" />
          Available:{" "}
          <strong className="text-white">
            {payIsUsdc ? walletUsdc.toFixed(2) : balancePay.toFixed(4)}
          </strong>{" "}
          {pay.symbol}
        </p>
      )}

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">Amount</span>
          {!payIsUsdc && (
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
          )}
        </div>

        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setSuccess(null);
          }}
          placeholder={payIsUsdc || amountMode === "usdc" ? "USDC amount" : "Token amount"}
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
            ≈{" "}
            {payIsUsdc
              ? `${usdcSpend.toFixed(2)} USDC`
              : `${tokenAmountSell.toFixed(4)} ${pay.symbol}`}{" "}
            →{" "}
            {receiveIsUsdc
              ? `${estReceive.toFixed(2)} USDC`
              : `${estReceive.toFixed(4)} ${receive.symbol}`}
          </p>
        )}
      </div>

      {isConnected ? (
        <Button
          variant="nexusSwap"
          className="nexus-swap-btn min-h-[48px] w-full gap-2"
          disabled={
            loading ||
            arcPending ||
            !pay ||
            !receive ||
            sameToken ||
            balancePay <= 0
          }
          onClick={() => void executeSwap()}
        >
          {loading || arcPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <NEXUS_TRADE_ICONS.swap className="h-4 w-4 shrink-0" />
          )}
          {sameToken
            ? "Pick two different tokens"
            : `Swap ${pay?.symbol ?? "—"} → ${receive?.symbol ?? "—"}`}
        </Button>
      ) : (
        <p className="text-center text-xs text-white/50">Connect wallet (top right) to swap</p>
      )}

      {success && (
        <div className="nexus-swap-success space-y-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-emerald-50">Done — swap successful</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-100/90">{success.summary}</p>
              <ul className="mt-2 space-y-0.5 text-[11px] text-emerald-100/80">
                {success.legs.map((leg) => (
                  <li key={leg}>✓ {leg}</li>
                ))}
              </ul>
              <a
                href={arcExplorerTx(success.feeTxHash)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100"
              >
                View Arc fee tx <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          {recentTrades.length > 0 && (
            <div className="border-t border-emerald-400/25 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">
                Recent successful txs
              </p>
              <ul className="mt-1.5 space-y-1">
                {recentTrades.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-white/75"
                  >
                    <span>
                      {t.side === "buy" ? "Buy" : t.side === "swap_to_usdc" ? "Swap→USDC" : "Sell"}{" "}
                      {t.symbol} · {t.usdcAmount.toFixed(2)} USDC
                    </span>
                    <a
                      href={arcExplorerTx(t.arcFeeTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-200/90 hover:underline"
                    >
                      tx
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
