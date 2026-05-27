import {
  createPublicClient,
  encodePacked,
  http,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet, ARC_TESTNET_ID } from "./arc-chain";

export { arcTestnet, ARC_TESTNET_ID, ARC_FEE_USD } from "./arc-chain";
export { isArcChain, arcExplorerTx, arcExplorerAddress } from "./arc-chain";

export function getArcPublicClient() {
  return createPublicClient({
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0]),
  });
}

type ArcStatus = {
  connected: boolean;
  chainId: number;
  blockNumber: number;
  rpcUrl: string;
  feeCurrency: string;
  estimatedFeeUsd: number;
  network: string;
  error?: string;
};

let arcStatusCache: { at: number; value: ArcStatus } | null = null;
const ARC_STATUS_TTL_MS = 60_000;

export async function getArcStatus() {
  if (arcStatusCache && Date.now() - arcStatusCache.at < ARC_STATUS_TTL_MS) {
    return arcStatusCache.value;
  }

  try {
    const client = getArcPublicClient();
    const [blockNumber, chainId] = await Promise.all([
      client.getBlockNumber(),
      client.getChainId(),
    ]);
    const value = {
      connected: true,
      chainId,
      blockNumber: Number(blockNumber),
      rpcUrl: arcTestnet.rpcUrls.default.http[0],
      feeCurrency: "USDC",
      estimatedFeeUsd: 0.01,
      network: "Arc Testnet",
    };
    arcStatusCache = { at: Date.now(), value };
    return value;
  } catch (error) {
    const value = {
      connected: false,
      chainId: ARC_TESTNET_ID,
      blockNumber: 0,
      rpcUrl: arcTestnet.rpcUrls.default.http[0],
      feeCurrency: "USDC",
      estimatedFeeUsd: 0.01,
      network: "Arc Testnet",
      error: error instanceof Error ? error.message : "Arc RPC unavailable",
    };
    arcStatusCache = { at: Date.now(), value };
    return value;
  }
}

export function buildArcAnchorData(payload: string) {
  const hash = keccak256(toHex(payload));
  return {
    hash,
    data: keccak256(encodePacked(["string", "bytes32"], ["NEXUS_PRISM_ANCHOR", hash])),
  };
}

export async function anchorDecisionPayload(payload: string) {
  const { hash, data } = buildArcAnchorData(payload);
  const privateKey = process.env.ARC_AGENT_PRIVATE_KEY;

  if (!privateKey) {
    return {
      anchored: false,
      hash,
      txHash: undefined as string | undefined,
      blockNumber: undefined as number | undefined,
      mode: "hash-only" as const,
      settlement: "Arc Testnet",
      feePaidIn: "USDC",
    };
  }

  try {
    const { createWalletClient } = await import("viem");
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(arcTestnet.rpcUrls.default.http[0]),
    });
    const publicClient = getArcPublicClient();

    const txHash = await walletClient.sendTransaction({
      account,
      to: account.address,
      value: BigInt(0),
      data,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    return {
      anchored: true,
      hash,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      mode: "onchain" as const,
      settlement: "Arc Testnet",
      feePaidIn: "USDC",
    };
  } catch (error) {
    return {
      anchored: false,
      hash,
      txHash: undefined,
      blockNumber: undefined,
      mode: "hash-only" as const,
      settlement: "Arc Testnet",
      feePaidIn: "USDC",
      error: error instanceof Error ? error.message : "Arc anchor failed",
    };
  }
}
