"use client";

import { useConnect, useAccount, useChainId, useSwitchChain } from "wagmi";
import { Wallet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateHash } from "@/lib/utils";
import { ARC_TESTNET_ID, arcTestnet } from "@/lib/arc-chain";
import { DEMO_TRADE_NETWORKS } from "@/lib/testnet-chains";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();

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
    return (
      <div className="flex flex-wrap items-center gap-2">
        {!onArc && (
          <Button variant="outline" size="sm" onClick={switchToArc} className="border-amber-400/40 text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Switch to Arc
          </Button>
        )}
        <Button variant="outline" size="sm">
          <Wallet className="h-4 w-4" />
          {network?.short ?? "Testnet"} · {truncateHash(address, 6, 4)}
        </Button>
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
