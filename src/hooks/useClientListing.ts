"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchListingById, fetchListings } from "@/lib/listings-api";
import type { Listing } from "@/lib/types";

/** Load a listing — Supabase API or localStorage fallback */
export function useClientListing(id: string) {
  const [listing, setListing] = useState<Listing | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void fetchListingById(id).then((result) => {
      if (!cancelled) setListing(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return listing;
}

/** All listings — refreshes when `refreshKey` changes */
export function useClientListings(refreshKey = 0) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchListings();
      setListings(Array.isArray(data) ? data : []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  useEffect(() => {
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reload]);

  return { listings, loading, reload };
}
