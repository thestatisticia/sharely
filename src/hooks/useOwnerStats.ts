"use client";

import { useCallback, useEffect, useState } from "react";

export type OwnerStats = {
  listingsCount: number;
  completedRentals: number;
  activeRentals: number;
  totalRentals: number;
};

const EMPTY: OwnerStats = {
  listingsCount: 0,
  completedRentals: 0,
  activeRentals: 0,
  totalRentals: 0,
};

export function useOwnerStats(wallet: `0x${string}` | undefined) {
  const [stats, setStats] = useState<OwnerStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!wallet) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/owners/stats?wallet=${encodeURIComponent(wallet)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Could not load owner stats");
      const data = (await res.json()) as OwnerStats;
      setStats(data);
    } catch {
      setStats(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { stats, loading, reload };
}
