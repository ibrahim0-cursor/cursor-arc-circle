"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, mainnet, arbitrum } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const config = createConfig({
  chains: [base, mainnet, arbitrum],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_ALCHEMY_BASE_RPC ??
        "https://base-mainnet.g.alchemy.com/v2/demo",
    ),
    [mainnet.id]: http(
      process.env.NEXT_PUBLIC_ALCHEMY_ETH_RPC ??
        "https://eth-mainnet.g.alchemy.com/v2/demo",
    ),
    [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
  },
  ssr: false,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
