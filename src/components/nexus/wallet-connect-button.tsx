"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateHash } from "@/lib/utils";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <Button variant="outline" size="sm" onClick={() => disconnect()}>
        <Wallet className="h-4 w-4" />
        {truncateHash(address, 6, 4)}
      </Button>
    );
  }

  return (
    <Button
      variant="nexus"
      size="sm"
      disabled={isPending}
      onClick={() => connect({ connector: connectors[0] })}
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
