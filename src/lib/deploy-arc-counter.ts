import { readFileSync } from "fs";
import { join } from "path";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import solc from "solc";
import { arcTestnet } from "./arc-chain";
import { ARC_COUNTER_ABI, getArcCounterAddress } from "./arc-counter-contract";

function compileCounterBytecode(): `0x${string}` {
  const source = readFileSync(
    join(process.cwd(), "contracts/src/Counter.sol"),
    "utf8",
  );
  const input = {
    language: "Solidity",
    sources: { "Counter.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input))) as {
    errors?: Array<{ severity: string; formattedMessage: string }>;
    contracts: Record<string, Record<string, { evm: { bytecode: { object: string } } }>>;
  };
  if (out.errors?.some((e) => e.severity === "error")) {
    throw new Error(out.errors.map((e) => e.formattedMessage).join("\n"));
  }
  const contract = out.contracts["Counter.sol"].Counter;
  return `0x${contract.evm.bytecode.object}` as `0x${string}`;
}

export async function deployArcCounterContract(): Promise<{
  deployer: string;
  contractAddress: `0x${string}`;
  txHash: string;
}> {
  const existing = getArcCounterAddress();
  if (existing) {
    return {
      deployer: "(skipped)",
      contractAddress: existing,
      txHash: "already-configured",
    };
  }

  const pk = process.env.ARC_AGENT_PRIVATE_KEY?.trim();
  if (!pk?.startsWith("0x")) {
    throw new Error("ARC_AGENT_PRIVATE_KEY not set on server");
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const bytecode = compileCounterBytecode();
  const rpc = arcTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(rpc) });
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(rpc),
  });

  const hash = await walletClient.deployContract({
    abi: ARC_COUNTER_ABI,
    bytecode,
    account,
    chain: arcTestnet,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error("Deploy tx failed — fund deployer with Arc Testnet USDC");
  }

  return {
    deployer: account.address,
    contractAddress: receipt.contractAddress,
    txHash: hash,
  };
}
