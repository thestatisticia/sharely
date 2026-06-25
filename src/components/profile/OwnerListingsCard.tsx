"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Package } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useClientRentals } from "@/hooks/useClientRentals";
import {
  fetchOwnerListings,
  setListingAvailability,
} from "@/lib/listings-api";
import type { Listing } from "@/lib/types";

function listingStatus(
  listing: Listing,
  rentedListingIds: Set<string>,
): "live" | "hidden" | "rented" {
  if (!listing.available && rentedListingIds.has(listing.id)) return "rented";
  if (!listing.available) return "hidden";
  return "live";
}

export function OwnerListingsCard({
  address,
}: {
  address: `0x${string}` | undefined;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { rentals } = useClientRentals(address);

  const rentedListingIds = new Set(
    rentals
      .filter(
        (r) =>
          r.ownerAddress.toLowerCase() === address?.toLowerCase() &&
          r.status !== "completed" &&
          Boolean(r.bookingId),
      )
      .map((r) => r.listingId),
  );

  const reload = useCallback(async () => {
    if (!address) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOwnerListings(address);
      setListings(data);
    } catch (err) {
      setListings([]);
      setError(err instanceof Error ? err.message : "Could not load listings");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function toggleVisibility(listing: Listing, hide: boolean) {
    setBusyId(listing.id);
    setError(null);
    try {
      await setListingAvailability(listing.id, !hide);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update listing",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!address) return null;

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">My listed items</p>
            <p className="text-sm text-muted">Hide or show items on Explore</p>
          </div>
        </div>
        <Link
          href="/list"
          className="text-sm font-semibold text-primary hover:underline"
        >
          + List item
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : listings.length === 0 ? (
        <p className="text-center text-sm text-muted">
          You have not listed any items yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {listings.map((listing) => {
            const status = listingStatus(listing, rentedListingIds);
            const busy = busyId === listing.id;

            return (
              <li
                key={listing.id}
                className="rounded-2xl border border-border/60 bg-surface-hover p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/item/${listing.id}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {listing.dailyRateG$} G$/day · {listing.area ?? listing.location}
                    </p>
                  </div>
                  <Badge
                    tone={
                      status === "live"
                        ? "success"
                        : status === "rented"
                          ? "warning"
                          : "muted"
                    }
                  >
                    {status === "live"
                      ? "Live"
                      : status === "rented"
                        ? "Rented"
                        : "Hidden"}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {status === "live" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void toggleVisibility(listing, true)}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      Hide from Explore
                    </Button>
                  ) : null}

                  {status === "hidden" ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void toggleVisibility(listing, false)}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      Show on Explore
                    </Button>
                  ) : null}

                  {status === "rented" ? (
                    <p className="text-xs text-muted">
                      Relists automatically when the rental ends.
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
