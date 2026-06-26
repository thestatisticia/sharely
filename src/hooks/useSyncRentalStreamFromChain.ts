"use client";

import { useEffect, useRef } from "react";

import { useRentalOnChain } from "@/hooks/useRentalOnChain";
import { patchRental } from "@/lib/rentals-api";
import { canSyncStreamFromChain } from "@/lib/rental-stream-state";
import type { Rental } from "@/lib/types";

/** When the stream is live on-chain for this booking but the DB row is stale, sync once. */
export function useSyncRentalStreamFromChain(
  rental: Rental,
  onUpdated: () => void,
) {
  const chain = useRentalOnChain(rental);
  const syncing = useRef(false);

  useEffect(() => {
    if (syncing.current || chain.flowLoading) return;
    if (
      !canSyncStreamFromChain(
        rental,
        chain.onChainFlowActive,
        chain.flowRate,
        chain.flowLastUpdated,
      )
    ) {
      return;
    }

    syncing.current = true;
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + rental.days);

    void patchRental(rental.id, {
      status: "active",
      streamStartedAt: now.toISOString(),
      startDate: now.toISOString(),
      endDate: end.toISOString(),
      streamStoppedAt: null,
    })
      .then(onUpdated)
      .catch(() => {})
      .finally(() => {
        syncing.current = false;
      });
  }, [
    rental,
    chain.onChainFlowActive,
    chain.flowRate,
    chain.flowLastUpdated,
    chain.flowLoading,
    onUpdated,
  ]);

  return chain;
}
