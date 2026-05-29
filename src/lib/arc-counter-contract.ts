import { arcTestnet } from "./arc-chain";

/** Minimal ABI for Foundry Counter.sol */
export const ARC_COUNTER_ABI = [
  {
    type: "function",
    name: "number",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "increment",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setNumber",
    inputs: [{ name: "newNumber", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Incremented",
    inputs: [{ name: "newNumber", type: "uint256", indexed: false, internalType: "uint256" }],
    anonymous: false,
  },
] as const;

export function getArcCounterAddress(): `0x${string}` | undefined {
  const raw =
    process.env.NEXT_PUBLIC_ARC_COUNTER_ADDRESS?.trim() ??
    process.env.ARC_COUNTER_ADDRESS?.trim();
  if (!raw || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return undefined;
  return raw as `0x${string}`;
}

export const arcCounterChain = arcTestnet;
