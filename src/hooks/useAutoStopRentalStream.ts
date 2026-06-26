"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import { CELO_CHAIN_ID } from "@/lib/contracts";
import {
  MIN_STREAM_RUNTIME_MS,
  streamStartIsoForCap,
} from "@/lib/rental-booking-stream";
import { deleteFlowArgs, rentalDailyRate } from "@/lib/rental-stream";
import { flowRateMatchesRental } from "@/lib/rental-stream-state";
import { patchRental } from "@/lib/rentals-api";
import { hasReachedRentalPaymentCap } from "@/lib/superfluid";
import type { Rental } from "@/lib/types";
import {
  waitForSuccessfulTx,
  writeContractFresh,
} from "@/lib/wallet-tx";

const POLL_MS = 12_000;

/** End the Superfluid stream once the booked rental total has been paid. */
export function useAutoStopRentalStream(
  rental: Rental,
  {
    streamActive,
    flowRate,
    flowLastUpdated,
    onRefetch,
    onUpdated,
  }: {
    streamActive: boolean;
    flowRate: bigint | undefined;
    flowLastUpdated: bigint | undefined;
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

  const streamStartIso = streamStartIsoForCap(rental, flowLastUpdated);
  const dailyRate = rentalDailyRate(rental);

  const stopStream = useCallback(async () => {
    if (!address || !publicClient || !isRenter || stoppingRef.current) return false;
    if (!streamActive) return false;

    stoppingRef.current = true;
    setStopping(true);
    try {
      const hash = await writeContractFresh(
        publicClient,
        writeContractAsync,
        address,
        deleteFlowArgs(rental),
      );
      await waitForSuccessfulTx(publicClient, hash);
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
    isRenter,
    onRefetch,
    onUpdated,
    publicClient,
    rental,
    streamActive,
    writeContractAsync,
  ]);

  useEffect(() => {
    if (!streamActive || !flowRate || !isRenter || !streamStartIso) {
      stopAttempted.current = false;
      setPaymentCapReached(false);
      return;
    }

    const evaluate = () => {
      if (!flowRateMatchesRental(flowRate, dailyRate)) return;
      const startMs = new Date(streamStartIso).getTime();
      if (Date.now() - startMs < MIN_STREAM_RUNTIME_MS) return;
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
    flowLastUpdated,
  ]);

  return { stopping, paymentCapReached, stopStream };
}
