import { defineChain } from "viem";

export const ARC_TESTNET_ID = 5042002;
/** Circle Arc node hard fork — https://github.com/circlefin/arc-node/releases/tag/v0.7.1 */
export const ARC_NODE_VERSION = "v0.7.1";
export const ARC_RPC_URL_DEFAULT = "https://rpc.testnet.arc.network";
export const ARC_FEE_USD = 0.01;
/** Per PRISM macro forecast (Arc testnet settlement) */
export const PRISM_FORECAST_FEE_USD = 0.01;

export const arcTestnet = defineChain({
  id: ARC_TESTNET_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARC_RPC_URL ?? ARC_RPC_URL_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Testnet Explorer",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

export function isArcChain(chainId?: number) {
  return chainId === ARC_TESTNET_ID;
}

export function arcExplorerTx(txHash: string) {
  return `https://testnet.arcscan.app/tx/${txHash}`;
}

export function arcExplorerAddress(address: string) {
  return `https://testnet.arcscan.app/address/${address}`;
}
