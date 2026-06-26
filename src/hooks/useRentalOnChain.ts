"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";

import {
  CFA_FORWARDER_ADDRESS,
  ESCROW_ADDRESS,
  G_DOLLAR_TOKEN_ADDRESS,
  cfaForwarderAbi,
  escrowAbi,
} from "@/lib/contracts";
import type { Rental } from "@/lib/types";
import {
  hasRecordedStreamStart,
  isStreamActiveForRental,
} from "@/lib/rental-stream-state";

type DepositLock = readonly [
  `0x${string}`,
  `0x${string}`,
  bigint,
  bigint,
  bigint,
  boolean,
];

export function useRentalOnChain(rental: Rental, peerRentals: Rental[] = []) {
  const hasEscrow = Boolean(ESCROW_ADDRESS && rental.bookingId);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

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
  const flowLastUpdated = flowInfo?.[0] as bigint | undefined;
  const flowRate = flowInfo?.[1] as bigint | undefined;
  const onChainFlowActive =
    flowRate !== undefined && flowRate > BigInt(0);
  const streamActive = isStreamActiveForRental(
    rental,
    onChainFlowActive,
    flowRate,
    flowLastUpdated,
    peerRentals,
  );

  const canClaimDeposit =
    hasEscrow &&
    !depositLoading &&
    !depositReleased &&
    claimableAfterSec !== undefined &&
    nowMs >= claimableAfterSec * 1000;

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
    hasRecordedStreamStart: hasRecordedStreamStart(rental),
    flowRate,
    flowLastUpdated,
    canClaimDeposit,
    claimableAfterDate,
    isComplete,
    nowMs,
    refetch: async () => {
      await Promise.all([refetchDeposit(), refetchFlow()]);
    },
  };
}
