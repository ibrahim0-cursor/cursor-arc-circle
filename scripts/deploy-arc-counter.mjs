/**
 * Deploy Counter.sol to Arc Testnet using viem (no Foundry required).
 * Usage: node scripts/deploy-arc-counter.mjs
 * Requires ARC_AGENT_PRIVATE_KEY in .env.local or environment.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import solc from "solc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function compileCounter() {
  const source = readFileSync(join(root, "contracts/src/Counter.sol"), "utf8");
  const input = {
    language: "Solidity",
    sources: { "Counter.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  if (out.errors?.some((e) => e.severity === "error")) {
    throw new Error(out.errors.map((e) => e.formattedMessage).join("\n"));
  }
  const contract = out.contracts["Counter.sol"].Counter;
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  };
}

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
};

async function main() {
  loadEnvLocal();
  const pk = process.env.ARC_AGENT_PRIVATE_KEY?.trim();
  if (!pk || !pk.startsWith("0x")) {
    console.error("Set ARC_AGENT_PRIVATE_KEY in .env.local (same wallet you funded on Arc).");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk);
  console.log("Deployer:", account.address);

  const { abi, bytecode } = compileCounter();
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0]),
  });
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0]),
  });

  const hash = await walletClient.deployContract({
    abi: parseAbi(abi),
    bytecode,
    account,
    chain: arcTestnet,
  });
  console.log("Tx:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error("Deploy failed — check USDC balance on Arc Testnet");
  }
  console.log("\nDeployed Counter:", receipt.contractAddress);
  console.log("\nAdd to .env.local and Vercel:");
  console.log(`NEXT_PUBLIC_ARC_COUNTER_ADDRESS=${receipt.contractAddress}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
