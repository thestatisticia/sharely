"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchRentalsForWallet } from "@/lib/rentals-api";
import type { Rental } from "@/lib/types";

export function useClientRentals(wallet: `0x${string}` | undefined) {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!wallet) {
      setRentals([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchRentalsForWallet(wallet);
      setRentals(Array.isArray(data) ? data : []);
    } catch (err) {
      setRentals([]);
      setError(err instanceof Error ? err.message : "Could not load rentals");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reload]);

  return { rentals, loading, error, reload };
}
