"use client";

import { Web3Provider } from "@/components/providers/web3-provider";
import { NexusConsole } from "@/components/nexus/nexus-console";

export function NexusApp() {
  return (
    <Web3Provider>
      <NexusConsole />
    </Web3Provider>
  );
}
