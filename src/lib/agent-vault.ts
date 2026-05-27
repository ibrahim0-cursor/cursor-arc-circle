import { privateKeyToAccount } from "viem/accounts";
import { formatEther, isAddress } from "viem";
import { getArcPublicClient } from "./arc";

export type AgentVaultMeta = {
  address: string;
  source: "env" | "agent_key" | "circle" | "unconfigured";
  configured: boolean;
};

export type AgentVaultLedger = {
  ownerWallet: string;
  balanceUsdc: number;
  totalDeposited: number;
  totalSpent: number;
  creditedTxHashes: string[];
  deposits: Array<{ txHash: string; amountUsdc: number; at: string }>;
  updatedAt: string;
};

/** Shared deposit address on Arc Testnet — always prefer env so every user sees the same vault */
export function resolveAgentVaultAddress(_circleAddress?: string | null): AgentVaultMeta {
  const envAddr =
    process.env.NEXT_PUBLIC_AGENT_VAULT_ADDRESS ??
    process.env.AGENT_VAULT_ADDRESS ??
    process.env.NEXT_PUBLIC_DEFAULT_AGENT_VAULT;
  if (envAddr && isAddress(envAddr)) {
    return { address: envAddr, source: "env", configured: true };
  }

  const pk = process.env.ARC_AGENT_PRIVATE_KEY;
  if (pk?.startsWith("0x")) {
    const account = privateKeyToAccount(pk as `0x${string}`);
    return { address: account.address, source: "agent_key", configured: true };
  }

  return { address: "", source: "unconfigured", configured: false };
}

/** Scan native USDC transfers to the vault from the owner (incremental, capped for serverless) */
export async function scanVaultDeposits(
  ownerWallet: string,
  vaultAddress: string,
  alreadyCredited: string[],
  fromBlock?: bigint,
): Promise<{ deposits: Array<{ txHash: string; amountUsdc: number }>; scannedToBlock: bigint }> {
  const client = getArcPublicClient();
  const owner = ownerWallet.toLowerCase();
  const vault = vaultAddress.toLowerCase();
  const credited = new Set(alreadyCredited.map((h) => h.toLowerCase()));

  const latest = await client.getBlockNumber();
  const maxSpan = BigInt(8000);
  const zero = BigInt(0);
  const windowStart = latest > maxSpan ? latest - maxSpan : zero;
  let start = fromBlock != null ? fromBlock + BigInt(1) : windowStart;
  if (start < windowStart) start = windowStart;
  if (start > latest) start = windowStart;

  const found: Array<{ txHash: string; amountUsdc: number }> = [];
  const batchSize = BigInt(16);

  for (let batchStart = start; batchStart <= latest; batchStart += batchSize) {
    const batchEnd =
      batchStart + batchSize - BigInt(1) > latest ? latest : batchStart + batchSize - BigInt(1);
    const blocks = Array.from(
      { length: Number(batchEnd - batchStart + BigInt(1)) },
      (_, i) => batchStart + BigInt(i),
    );
    const blockResults = await Promise.all(
      blocks.map((n) => client.getBlock({ blockNumber: n, includeTransactions: true })),
    );
    for (const block of blockResults) {
      for (const tx of block.transactions) {
        if (typeof tx === "string") continue;
        if (tx.to?.toLowerCase() !== vault) continue;
        if (tx.from?.toLowerCase() !== owner) continue;
        if (!tx.value || tx.value <= BigInt(0)) continue;
        const hash = tx.hash.toLowerCase();
        if (credited.has(hash)) continue;
        const amountUsdc = Number(formatEther(tx.value));
        if (amountUsdc < 0.01) continue;
        found.push({ txHash: tx.hash, amountUsdc });
        credited.add(hash);
      }
    }
  }

  return { deposits: found, scannedToBlock: latest };
}

/** Verify a single deposit transaction and return credited amount */
export async function verifyVaultDepositTx(
  ownerWallet: string,
  vaultAddress: string,
  txHash: string,
): Promise<{ amountUsdc: number } | null> {
  const client = getArcPublicClient();
  const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
  if (!tx?.to || !tx.from || !tx.value) return null;
  if (tx.to.toLowerCase() !== vaultAddress.toLowerCase()) return null;
  if (tx.from.toLowerCase() !== ownerWallet.toLowerCase()) return null;
  const amountUsdc = Number(formatEther(tx.value));
  if (amountUsdc < 0.01) return null;
  return { amountUsdc };
}

export function emptyLedger(ownerWallet: string): AgentVaultLedger {
  return {
    ownerWallet: ownerWallet.toLowerCase(),
    balanceUsdc: 0,
    totalDeposited: 0,
    totalSpent: 0,
    creditedTxHashes: [],
    deposits: [],
    updatedAt: new Date().toISOString(),
  };
}
