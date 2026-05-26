import {
  createPublicClient,
  createWalletClient,
  encodePacked,
  http,
  keccak256,
  parseEther,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network"],
    },
  },
} as const;

export function getArcPublicClient() {
  return createPublicClient({
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0]),
  });
}

export async function getArcStatus() {
  try {
    const client = getArcPublicClient();
    const [blockNumber, chainId] = await Promise.all([
      client.getBlockNumber(),
      client.getChainId(),
    ]);
    return {
      connected: true,
      chainId,
      blockNumber: Number(blockNumber),
      rpcUrl: arcTestnet.rpcUrls.default.http[0],
    };
  } catch (error) {
    return {
      connected: false,
      chainId: arcTestnet.id,
      blockNumber: 0,
      rpcUrl: arcTestnet.rpcUrls.default.http[0],
      error: error instanceof Error ? error.message : "Arc RPC unavailable",
    };
  }
}

export async function anchorDecisionPayload(payload: string) {
  const hash = keccak256(toHex(payload));
  const privateKey = process.env.ARC_AGENT_PRIVATE_KEY;

  if (!privateKey) {
    return {
      anchored: false,
      hash,
      txHash: undefined as string | undefined,
      blockNumber: undefined as number | undefined,
      mode: "hash-only" as const,
    };
  }

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(arcTestnet.rpcUrls.default.http[0]),
    });
    const publicClient = getArcPublicClient();
    const data = encodePacked(["string", "bytes32"], ["NEXUS_PRISM_ANCHOR", hash]);

    const txHash = await walletClient.sendTransaction({
      account,
      to: account.address,
      value: parseEther("0"),
      data: keccak256(data),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    return {
      anchored: true,
      hash,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      mode: "onchain" as const,
    };
  } catch (error) {
    return {
      anchored: false,
      hash,
      txHash: undefined,
      blockNumber: undefined,
      mode: "hash-only" as const,
      error: error instanceof Error ? error.message : "Arc anchor failed",
    };
  }
}
