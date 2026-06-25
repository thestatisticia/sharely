import type { Listing } from "@/lib/types";
import {
  getListingById,
  getListings,
  saveListing,
  updateListingAvailability,
} from "@/lib/store";

export function useRemoteListings(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function fetchListings(): Promise<Listing[]> {
  if (useRemoteListings()) {
    const res = await fetch("/api/listings", { cache: "no-store" });
    const data: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : "Could not load listings";
      throw new Error(message);
    }

    if (!Array.isArray(data)) {
      throw new Error("Invalid listings response");
    }

    return data as Listing[];
  }
  return getListings();
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (useRemoteListings()) {
    const res = await fetch(`/api/listings/${id}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Could not load listing");
    return (await res.json()) as Listing;
  }
  return getListingById(id) ?? null;
}

export async function createListing(listing: Listing): Promise<void> {
  if (useRemoteListings()) {
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listing),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Could not publish listing");
    }
    return;
  }
  saveListing(listing);
}

export async function setListingAvailability(
  listingId: string,
  available: boolean,
): Promise<void> {
  updateListingAvailability(listingId, available);

  if (!useRemoteListings()) return;

  const res = await fetch(`/api/listings/${listingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ available }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not update listing availability");
  }
}
