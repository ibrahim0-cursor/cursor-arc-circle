"use client";

import { useConnect, useAccount, useChainId, useSwitchChain } from "wagmi";
import { Wallet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateHash } from "@/lib/utils";
import { ARC_TESTNET_ID, arcTestnet } from "@/lib/arc-chain";

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

  async function switchToArc() {
    try {
      await switchChainAsync({ chainId: ARC_TESTNET_ID });
    } catch {
      const eth = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      await eth?.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${ARC_TESTNET_ID.toString(16)}`,
            chainName: arcTestnet.name,
            nativeCurrency: arcTestnet.nativeCurrency,
            rpcUrls: arcTestnet.rpcUrls.default.http,
            blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
          },
        ],
      });
      await switchChainAsync({ chainId: ARC_TESTNET_ID });
    }
  }

  if (isConnected && address) {
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
          {onArc ? "Arc · " : ""}
          {truncateHash(address, 6, 4)}
        </Button>
      </div>
    );
  }

  return (
    <Button variant="nexus" size="sm" onClick={connectWallet}>
      <Wallet className="h-4 w-4" />
      Connect on Arc Testnet
    </Button>
  );
}
