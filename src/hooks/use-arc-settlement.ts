"use client";

import { useCallback } from "react";
import { useAccount, useChainId, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
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
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync, data: txHash, isPending } = useSendTransaction();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

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

  /** Records action on Arc testnet — gas paid in native USDC */
  const payArcFee = useCallback(
    async (action: string, payload: string) => {
      await ensureArcNetwork();
      if (!address) throw new Error("Wallet not connected");

      const hash = keccak256(toHex(payload));
      const data = keccak256(
        encodePacked(["string", "string", "bytes32"], ["NEXUS_ARC_FEE", action, hash]),
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
