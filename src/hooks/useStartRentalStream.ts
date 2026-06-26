"use client";

import { useCallback } from "react";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useSignMessage,
  useWriteContract,
} from "wagmi";

import { CELO_CHAIN_ID } from "@/lib/contracts";
import { patchRental } from "@/lib/rentals-api";
import { buildStreamStartSignMessage } from "@/lib/rental-sign";
import {
  createFlowArgs,
  rentalDailyRate,
  validateStreamStart,
} from "@/lib/rental-stream";
import type { Rental } from "@/lib/types";
import { useGBalance } from "@/hooks/useGoodDollar";

export function useStartRentalStream(rental: Rental) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: CELO_CHAIN_ID });
  const { balance: gBalance, refetch: refetchGBalance } = useGBalance();
  const { data: celoBalance } = useBalance({
    address,
    chainId: CELO_CHAIN_ID,
  });
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();

  const startStream = useCallback(async () => {
    if (!address) throw new Error("Connect your wallet on Celo.");
    if (!publicClient) throw new Error("No RPC client for Celo.");

    if (gBalance === undefined) {
      throw new Error("Could not read your G$ balance. Try again.");
    }

    const { flowRate } = await validateStreamStart({
      publicClient,
      rental,
      gBalanceWei: gBalance,
      celoBalanceWei: celoBalance?.value,
      chainId,
    });

    const attestAt = new Date().toISOString();
    await signMessageAsync({
      message: buildStreamStartSignMessage(rental, attestAt),
    });

    const flowCall = createFlowArgs(rental, address, flowRate);
    const { request } = await publicClient.simulateContract({
      ...flowCall,
      account: address,
    });

    const hash = await writeContractAsync(request);

    await publicClient.waitForTransactionReceipt({ hash });

    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + rental.days);

    await patchRental(rental.id, {
      status: "active",
      flowTxHash: hash,
      txHash: hash,
      streamStartedAt: now.toISOString(),
      startDate: now.toISOString(),
      endDate: end.toISOString(),
    });

    await refetchGBalance();
    return hash;
  }, [
    address,
    celoBalance?.value,
    chainId,
    gBalance,
    publicClient,
    rental,
    refetchGBalance,
    signMessageAsync,
    writeContractAsync,
  ]);

  return {
    startStream,
    dailyRate: rentalDailyRate(rental),
  };
}
