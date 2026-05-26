import { defineChain } from "viem";
import { arcTestnet, ARC_TESTNET_ID } from "./arc-chain";

export const sepolia = defineChain({
  id: 11_155_111,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org"],
    },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
  testnet: true,
});

export const baseSepolia = defineChain({
  id: 84_532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"],
    },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://sepolia.basescan.org" },
  },
  testnet: true,
});

export const arbitrumSepolia = defineChain({
  id: 421_614,
  name: "Arbitrum Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc"],
    },
  },
  blockExplorers: {
    default: { name: "Arbiscan", url: "https://sepolia.arbiscan.io" },
  },
  testnet: true,
});

/** Demo trade networks — all fees settle on Arc USDC */
export const DEMO_TRADE_NETWORKS = [
  { id: "arc", chainId: ARC_TESTNET_ID, label: "Arc Testnet", short: "Arc", chain: arcTestnet },
  { id: "sepolia", chainId: sepolia.id, label: "Ethereum Sepolia", short: "Sepolia", chain: sepolia },
  { id: "base-sepolia", chainId: baseSepolia.id, label: "Base Sepolia", short: "Base", chain: baseSepolia },
  {
    id: "arbitrum-sepolia",
    chainId: arbitrumSepolia.id,
    label: "Arbitrum Sepolia",
    short: "Arb",
    chain: arbitrumSepolia,
  },
] as const;

export type DemoTradeNetworkId = (typeof DEMO_TRADE_NETWORKS)[number]["id"];

export function demoNetworkById(id: DemoTradeNetworkId) {
  return DEMO_TRADE_NETWORKS.find((n) => n.id === id) ?? DEMO_TRADE_NETWORKS[0];
}

export function demoNetworkFromChainId(chainId?: number) {
  return DEMO_TRADE_NETWORKS.find((n) => n.chainId === chainId);
}

/** Maps DexScreener mainnet chain to preferred demo testnet */
export function mirrorTestnetForSource(sourceChain: string): DemoTradeNetworkId {
  if (sourceChain === "base") return "base-sepolia";
  if (sourceChain === "ethereum") return "sepolia";
  if (sourceChain === "arbitrum") return "arbitrum-sepolia";
  return "arc";
}

export function birdeyeChainFor(sourceChain: string) {
  if (sourceChain === "solana") return "solana";
  if (sourceChain === "base") return "base";
  if (sourceChain === "arbitrum") return "arbitrum";
  return "ethereum";
}
