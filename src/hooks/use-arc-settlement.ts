"use client";

import { useCallback } from "react";
import { useAccount, useChainId, usePublicClient, useSendTransaction, useSwitchChain } from "wagmi";
import { encodePacked, keccak256, toHex } from "viem";
import { arcTestnet, ARC_TESTNET_ID, ARC_FEE_USD } from "@/lib/arc-chain";

async function addArcToWallet() {
  const eth = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
  if (!eth) return;
  await eth.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: `0x${ARC_TESTNET_ID.toString(16)}`,
        chainName: arcTestnet.name,
        nativeCurrency: arcTestnet.nativeCurrency,
        rpcUrls: arcTestnet.rpcUrls.default.http,
        blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
      },
    ],
  });
}

export function useArcSettlement() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_ID });
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const onArc = chainId === ARC_TESTNET_ID;

  const ensureArcNetwork = useCallback(async () => {
    if (!isConnected) throw new Error("Connect wallet first");
    if (chainId === ARC_TESTNET_ID) return;

    try {
      await switchChainAsync({ chainId: ARC_TESTNET_ID });
    } catch {
      await addArcToWallet();
      await switchChainAsync({ chainId: ARC_TESTNET_ID });
    }

    await new Promise((r) => setTimeout(r, 400));
  }, [chainId, isConnected, switchChainAsync]);

  /** Records action on Arc testnet. Default waits for receipt; autopilot uses waitReceipt: false for speed. */
  const payArcFee = useCallback(
    async (action: string, payload: string, opts?: { waitReceipt?: boolean }) => {
      await ensureArcNetwork();
      if (!address) throw new Error("Wallet not connected");

      const hash = keccak256(toHex(payload));
      const data = keccak256(
        encodePacked(["string", "string", "bytes32"], ["NEXUS_ARC_FEE", action, hash]),
      );

      const txHash = await sendTransactionAsync({
        chainId: ARC_TESTNET_ID,
        to: address,
        value: BigInt(0),
        data,
      });

      const base = {
        txHash,
        payloadHash: hash,
        feeUsd: ARC_FEE_USD,
        chain: arcTestnet.name,
        blockNumber: undefined as number | undefined,
      };

      const waitReceipt = opts?.waitReceipt !== false;
      if (!waitReceipt || !publicClient) {
        return base;
      }

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 45_000,
      });

      if (receipt.status !== "success") {
        throw new Error("Arc transaction failed on-chain. Check testnet.arcscan.app.");
      }

      return { ...base, blockNumber: Number(receipt.blockNumber) };
    },
    [address, ensureArcNetwork, publicClient, sendTransactionAsync],
  );

  return {
    onArc,
    arcChainId: ARC_TESTNET_ID,
    feeUsd: ARC_FEE_USD,
    payArcFee,
    ensureArcNetwork,
    isPending,
  };
}
