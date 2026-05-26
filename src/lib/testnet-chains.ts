import { arcTestnet, ARC_TESTNET_ID } from "./arc-chain";

/** Arc Testnet only — all demo trades and fees settle in USDC on Arc */
export const DEMO_TRADE_NETWORKS = [
  { id: "arc", chainId: ARC_TESTNET_ID, label: "Arc Testnet", short: "Arc", chain: arcTestnet },
] as const;

export type DemoTradeNetworkId = (typeof DEMO_TRADE_NETWORKS)[number]["id"];

export function demoNetworkById(id: DemoTradeNetworkId = "arc") {
  return DEMO_TRADE_NETWORKS[0];
}

export function demoNetworkFromChainId(chainId?: number) {
  return chainId === ARC_TESTNET_ID ? DEMO_TRADE_NETWORKS[0] : undefined;
}

/** All demo trades execute on Arc regardless of price feed source chain */
export function mirrorTestnetForSource(_sourceChain: string): DemoTradeNetworkId {
  return "arc";
}

/** @deprecated use birdeyeChainFor from @/lib/birdeye-client */
export { birdeyeChainFor } from "./birdeye-client";
