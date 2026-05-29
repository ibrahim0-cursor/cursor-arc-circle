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

/** Compiled Counter.sol (solc 0.8.24) — for wallet-side deploy on /arc */
export const ARC_COUNTER_BYTECODE =
  "0x608060405234801561000f575f80fd5b506101748061001d5f395ff3fe608060405234801561000f575f80fd5b506004361061003f575f3560e01c80633fb5c1cb146100435780638381f58a14610058578063d09de08a14610072575b5f80fd5b610056610051366004610103565b61007a565b005b6100605f5481565b60405190815260200160405180910390f35b6100566100b4565b5f8190556040518181527f9ec8254969d1974eac8c74afb0c03595b4ffe0a1d7ad8a7f82ed31b9c85425919060200160405180910390a150565b5f805490806100c28361011a565b91905055507f20d8a6f5a693f9d1d627a598e8820f7a55ee74c183aa8f1a30e8d4e8dd9a8d845f546040516100f991815260200190565b60405180910390a1565b5f60208284031215610113575f80fd5b5035919050565b5f6001820161013757634e487b7160e01b5f52601160045260245ffd5b506001019056fea2646970667358221220373d0519e5d68ea651b8a9a321bbc433373ab28db0c561fb13ea390f598ab01064736f6c63430008180033" as const;

export const ARC_COUNTER_STORAGE_KEY = "meridian-arc-counter";

export function getArcCounterAddress(): `0x${string}` | undefined {
  const raw =
    process.env.NEXT_PUBLIC_ARC_COUNTER_ADDRESS?.trim() ??
    process.env.ARC_COUNTER_ADDRESS?.trim();
  if (!raw || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return undefined;
  return raw as `0x${string}`;
}

export const arcCounterChain = arcTestnet;
