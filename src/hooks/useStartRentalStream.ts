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
import { flowStartedAfterHandover } from "@/lib/rental-stream-state";
import {
  createFlowArgs,
  deleteFlowArgs,
  formatStreamStartError,
  getExistingFlowRate,
  getFlowLastUpdated,
  planStreamStart,
  rentalDailyRate,
  updateFlowArgs,
  validateStreamStart,
} from "@/lib/rental-stream";
import type { Rental } from "@/lib/types";
import { useGBalance } from "@/hooks/useGoodDollar";

async function patchStreamStarted(rental: Rental, txHash?: `0x${string}`) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + rental.days);

  await patchRental(rental.id, {
    status: "active",
    ...(txHash ? { flowTxHash: txHash, txHash } : {}),
    streamStartedAt: now.toISOString(),
    startDate: now.toISOString(),
    endDate: end.toISOString(),
    streamStoppedAt: null,
  });
}

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

    const existingRate = await getExistingFlowRate(publicClient, rental);
    let plan = planStreamStart(existingRate, flowRate);

    if (plan === "sync") {
      const lastUpdated = await getFlowLastUpdated(publicClient, rental);
      const flowBelongsToBooking = flowStartedAfterHandover(
        lastUpdated,
        rental.ownerHandoverAt,
      );
      if (!flowBelongsToBooking) {
        plan = "replace";
      }
    }

    if (plan === "sync") {
      await patchStreamStarted(rental);
      await refetchGBalance();
      return null;
    }

    const attestAt = new Date().toISOString();
    await signMessageAsync({
      message: buildStreamStartSignMessage(rental, attestAt),
    });

    if (plan === "replace") {
      const deleteCall = deleteFlowArgs(rental);
      const { request: deleteRequest } = await publicClient.simulateContract({
        ...deleteCall,
        account: address,
      });
      const deleteHash = await writeContractAsync(deleteRequest);
      const deleteReceipt = await publicClient.waitForTransactionReceipt({
        hash: deleteHash,
      });
      if (deleteReceipt.status === "reverted") {
        throw new Error("Could not clear the previous payment stream.");
      }
      plan = "create";
    }

    const flowCall =
      plan === "update"
        ? updateFlowArgs(rental, address, flowRate)
        : createFlowArgs(rental, address, flowRate);

    const { request } = await publicClient.simulateContract({
      ...flowCall,
      account: address,
    });

    const hash = await writeContractAsync(request);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error(
        "Stream transaction failed on-chain. Make sure you have enough G$ for rental payments (not just the escrow deposit).",
      );
    }

    await patchStreamStarted(rental, hash);
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
    formatError: formatStreamStartError,
  };
}
