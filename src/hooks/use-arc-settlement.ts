"use client";

import { useCallback } from "react";
import { useAccount, useChainId, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { encodePacked, keccak256, toHex } from "viem";
import { arcTestnet, ARC_TESTNET_ID, ARC_FEE_USD } from "@/lib/arc-chain";

export function useArcSettlement() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync, data: txHash, isPending } = useSendTransaction();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  const onArc = chainId === ARC_TESTNET_ID;

  const ensureArcNetwork = useCallback(async () => {
    if (!isConnected) throw new Error("Connect wallet first");
    if (chainId !== ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: ARC_TESTNET_ID });
    }
  }, [chainId, isConnected, switchChainAsync]);

  /** Pays ~$0.01 USDC gas on Arc testnet to record agent action on-chain */
  const payArcFee = useCallback(
    async (action: string, payload: string) => {
      await ensureArcNetwork();
      if (!address) throw new Error("Wallet not connected");

      const hash = keccak256(toHex(payload));
      const data = keccak256(
        encodePacked(
          ["string", "string", "bytes32"],
          ["NEXUS_ARC_FEE", action, hash],
        ),
      );

      const tx = await sendTransactionAsync({
        chainId: ARC_TESTNET_ID,
        to: address,
        value: BigInt(0),
        data,
      });

      return { txHash: tx, payloadHash: hash, feeUsd: ARC_FEE_USD, chain: arcTestnet.name };
    },
    [address, ensureArcNetwork, sendTransactionAsync],
  );

  return {
    onArc,
    arcChainId: ARC_TESTNET_ID,
    feeUsd: ARC_FEE_USD,
    payArcFee,
    ensureArcNetwork,
    txHash,
    isPending: isPending || confirming,
  };
}
