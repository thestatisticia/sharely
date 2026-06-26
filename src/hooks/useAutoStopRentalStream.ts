"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import { CELO_CHAIN_ID } from "@/lib/contracts";
import { deleteFlowArgs, rentalDailyRate } from "@/lib/rental-stream";
import { flowRateMatchesRental } from "@/lib/rental-stream-state";
import { patchRental } from "@/lib/rentals-api";
import { hasReachedRentalPaymentCap } from "@/lib/superfluid";
import type { Rental } from "@/lib/types";

const POLL_MS = 12_000;

/** End the Superfluid stream once the booked rental total has been paid. */
export function useAutoStopRentalStream(
  rental: Rental,
  {
    streamActive,
    flowRate,
    onRefetch,
    onUpdated,
  }: {
    streamActive: boolean;
    flowRate: bigint | undefined;
    onRefetch: () => Promise<void>;
    onUpdated: () => void | Promise<void>;
  },
) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: CELO_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const [stopping, setStopping] = useState(false);
  const [paymentCapReached, setPaymentCapReached] = useState(false);
  const stopAttempted = useRef(false);
  const stoppingRef = useRef(false);

  const isRenter =
    address &&
    rental.renterAddress.toLowerCase() === address.toLowerCase();

  const streamStartIso = rental.streamStartedAt ?? rental.startDate;
  const dailyRate = rentalDailyRate(rental);

  const stopStream = useCallback(async () => {
    if (!address || !publicClient || !isRenter || stoppingRef.current) return false;
    if (!flowRate || !flowRateMatchesRental(flowRate, dailyRate)) return false;

    stoppingRef.current = true;
    setStopping(true);
    try {
      const call = deleteFlowArgs(rental);
      const { request } = await publicClient.simulateContract({
        ...call,
        account: address,
      });
      const hash = await writeContractAsync(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        stopAttempted.current = false;
        return false;
      }
      await patchRental(rental.id, {
        streamStoppedAt: new Date().toISOString(),
      });
      await onRefetch();
      await onUpdated();
      return true;
    } catch {
      stopAttempted.current = false;
      return false;
    } finally {
      stoppingRef.current = false;
      setStopping(false);
    }
  }, [
    address,
    dailyRate,
    flowRate,
    isRenter,
    onRefetch,
    onUpdated,
    publicClient,
    rental,
    writeContractAsync,
  ]);

  useEffect(() => {
    if (!streamActive || !flowRate || !isRenter) {
      stopAttempted.current = false;
      setPaymentCapReached(false);
      return;
    }

    const evaluate = () => {
      if (!flowRateMatchesRental(flowRate, dailyRate)) return;
      const reached = hasReachedRentalPaymentCap(
        flowRate,
        streamStartIso,
        dailyRate,
        rental.days,
      );
      setPaymentCapReached(reached);
      if (reached && !stopAttempted.current) {
        stopAttempted.current = true;
        void stopStream();
      }
    };

    evaluate();
    const id = window.setInterval(evaluate, POLL_MS);
    return () => window.clearInterval(id);
  }, [
    dailyRate,
    flowRate,
    isRenter,
    rental.days,
    stopStream,
    streamActive,
    streamStartIso,
  ]);

  return { stopping, paymentCapReached, stopStream };
}
