"use client";

import { useEffect, useRef } from "react";

import { useRentalOnChain } from "@/hooks/useRentalOnChain";
import { patchRental } from "@/lib/rentals-api";
import type { Rental } from "@/lib/types";

/** When the stream is live on-chain but the DB row is stale, sync and refresh. */
export function useSyncRentalStreamFromChain(
  rental: Rental,
  onUpdated: () => void,
) {
  const chain = useRentalOnChain(rental);
  const syncing = useRef(false);

  useEffect(() => {
    if (syncing.current) return;
    if (!rental.bookingId || !rental.ownerHandoverAt) return;
    if (rental.flowTxHash || rental.streamStartedAt) return;
    if (!chain.onChainFlowActive || chain.flowLoading) return;

    syncing.current = true;
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + rental.days);

    void patchRental(rental.id, {
      status: "active",
      streamStartedAt: now.toISOString(),
      startDate: now.toISOString(),
      endDate: end.toISOString(),
    })
      .then(onUpdated)
      .catch(() => {})
      .finally(() => {
        syncing.current = false;
      });
  }, [
    rental.id,
    rental.bookingId,
    rental.ownerHandoverAt,
    rental.flowTxHash,
    rental.streamStartedAt,
    rental.days,
    chain.onChainFlowActive,
    chain.flowLoading,
    onUpdated,
  ]);

  return chain;
}
