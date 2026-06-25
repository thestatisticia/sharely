"use client";

import { useEffect, useState } from "react";

import { fetchActiveRentalForListing } from "@/lib/rentals-api";
import type { Rental } from "@/lib/types";

export function useListingRentalStatus(
  listingId: string,
  available: boolean,
) {
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(!available);

  useEffect(() => {
    if (available) {
      setRental(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchActiveRentalForListing(listingId)
      .then((active) => {
        if (!cancelled) setRental(active);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingId, available]);

  return { rental, loading };
}
