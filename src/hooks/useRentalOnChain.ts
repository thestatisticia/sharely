"use client";

import { useReadContract } from "wagmi";

import {
  CFA_FORWARDER_ADDRESS,
  ESCROW_ADDRESS,
  G_DOLLAR_TOKEN_ADDRESS,
  cfaForwarderAbi,
  escrowAbi,
} from "@/lib/contracts";
import type { Rental } from "@/lib/types";

type DepositLock = readonly [
  `0x${string}`,
  `0x${string}`,
  bigint,
  bigint,
  bigint,
  boolean,
];

export function useRentalOnChain(rental: Rental) {
  const hasEscrow = Boolean(ESCROW_ADDRESS && rental.bookingId);

  const {
    data: depositData,
    isLoading: depositLoading,
    refetch: refetchDeposit,
  } = useReadContract({
    address: ESCROW_ADDRESS as `0x${string}`,
    abi: escrowAbi,
    functionName: "deposits",
    args: rental.bookingId ? [rental.bookingId] : undefined,
    query: { enabled: hasEscrow },
  });

  const {
    data: flowInfo,
    isLoading: flowLoading,
    refetch: refetchFlow,
  } = useReadContract({
    address: CFA_FORWARDER_ADDRESS,
    abi: cfaForwarderAbi,
    functionName: "getFlowInfo",
    args: [
      G_DOLLAR_TOKEN_ADDRESS,
      rental.renterAddress,
      rental.ownerAddress,
    ],
    query: {
      enabled: Boolean(rental.renterAddress && rental.ownerAddress),
    },
  });

  const deposit = depositData as DepositLock | undefined;
  const depositReleased = deposit?.[5] ?? false;
  const claimableAfterSec = deposit?.[4] ? Number(deposit[4]) : undefined;
  const flowRate = flowInfo?.[1] as bigint | undefined;
  const onChainFlowActive =
    flowRate !== undefined && flowRate > BigInt(0);
  /** Only count a stream for this rental after pickup was confirmed in-app. */
  const streamStartedForRental = Boolean(
    rental.flowTxHash || rental.streamStartedAt,
  );
  const streamActive = onChainFlowActive && streamStartedForRental;

  const canClaimDeposit =
    hasEscrow &&
    !depositLoading &&
    !depositReleased &&
    claimableAfterSec !== undefined &&
    Date.now() >= claimableAfterSec * 1000;

  const claimableAfterDate =
    claimableAfterSec !== undefined
      ? new Date(claimableAfterSec * 1000)
      : undefined;

  const isComplete = depositReleased && !streamActive;

  return {
    hasEscrow,
    depositLoading,
    flowLoading,
    depositReleased,
    onChainFlowActive,
    streamActive,
    canClaimDeposit,
    claimableAfterDate,
    isComplete,
    refetch: async () => {
      await Promise.all([refetchDeposit(), refetchFlow()]);
    },
  };
}
