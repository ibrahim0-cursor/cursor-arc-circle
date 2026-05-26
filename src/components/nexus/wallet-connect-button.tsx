"use client";

import { useConnect, useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { Wallet, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateHash } from "@/lib/utils";
import { ARC_TESTNET_ID, arcExplorerAddress } from "@/lib/arc-chain";
import { DEMO_TRADE_NETWORKS } from "@/lib/testnet-chains";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: balance } = useBalance({ address, chainId: ARC_TESTNET_ID });

  const onArc = chainId === ARC_TESTNET_ID;

  async function connectWallet() {
    const connector = connectors[0];
    if (connector) connect({ connector, chainId: ARC_TESTNET_ID });
  }

  async function addAndSwitchChain(chain: (typeof DEMO_TRADE_NETWORKS)[number]) {
    try {
      await switchChainAsync({ chainId: chain.chainId });
    } catch {
      const eth = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      await eth?.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${chain.chainId.toString(16)}`,
            chainName: chain.chain.name,
            nativeCurrency: chain.chain.nativeCurrency,
            rpcUrls: chain.chain.rpcUrls.default.http,
            blockExplorerUrls: chain.chain.blockExplorers
              ? [chain.chain.blockExplorers.default.url]
              : [],
          },
        ],
      });
      await switchChainAsync({ chainId: chain.chainId });
    }
  }

  async function switchToArc() {
    await addAndSwitchChain(DEMO_TRADE_NETWORKS[0]);
  }

  if (isConnected && address) {
    const network = DEMO_TRADE_NETWORKS.find((n) => n.chainId === chainId);
    const balanceLabel = balance ? `${Number(balance.formatted).toFixed(2)} USDC` : null;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {!onArc && (
          <Button variant="outline" size="sm" onClick={switchToArc} className="border-amber-400/40 text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Switch to Arc
          </Button>
        )}
        <a
          href={arcExplorerAddress(address)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/85 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
        >
          <Wallet className="h-4 w-4 text-cyan-300" />
          {network?.short ?? "Testnet"} · {truncateHash(address, 6, 4)}
          {balanceLabel && (
            <span className="rounded-md border border-cyan-300/20 bg-cyan-400/10 px-1.5 py-0.5 text-[11px] text-cyan-200">
              {balanceLabel}
            </span>
          )}
          <ExternalLink className="h-3 w-3 text-white/40" />
        </a>
      </div>
    );
  }

  return (
    <Button variant="nexus" size="sm" onClick={connectWallet}>
      <Wallet className="h-4 w-4" />
      Connect · Arc Testnet
    </Button>
  );
}
