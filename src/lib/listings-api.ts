import type { Listing } from "@/lib/types";
import {
  getListingById,
  getListings,
  saveListing,
  updateListingVisibility,
} from "@/lib/store";

export function notifyListingsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sharely:listings-updated"));
  }
}

export function isRemoteListingsEnabled(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function useRemoteListings(): boolean {
  return isRemoteListingsEnabled();
}

export async function fetchListings(): Promise<Listing[]> {
  if (isRemoteListingsEnabled()) {
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
  if (isRemoteListingsEnabled()) {
    const res = await fetch(`/api/listings/${id}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Could not load listing");
    return (await res.json()) as Listing;
  }
  return getListingById(id) ?? null;
}

export async function createListing(listing: Listing): Promise<void> {
  if (isRemoteListingsEnabled()) {
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

export async function fetchOwnerListings(
  wallet: `0x${string}`,
): Promise<import("@/lib/types").Listing[]> {
  if (!isRemoteListingsEnabled()) {
    const lower = wallet.toLowerCase();
    return getListings().filter(
      (l) => l.ownerAddress.toLowerCase() === lower,
    );
  }

  const res = await fetch(
    `/api/listings/owner?wallet=${encodeURIComponent(wallet)}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Could not load your listings");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function setListingVisibility(
  listingId: string,
  patch: { available?: boolean; hiddenByOwner?: boolean },
): Promise<void> {
  updateListingVisibility(listingId, patch);

  if (!isRemoteListingsEnabled()) {
    notifyListingsUpdated();
    return;
  }

  const res = await fetch(`/api/listings/${listingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not update listing visibility");
  }

  notifyListingsUpdated();
}

export async function setListingAvailability(
  listingId: string,
  available: boolean,
): Promise<void> {
  await setListingVisibility(listingId, { available });
}

export async function relistAfterRental(
  listingId: string,
  ownerAddress: `0x${string}`,
): Promise<void> {
  const listings = await fetchOwnerListings(ownerAddress);
  const listing = listings.find((l) => l.id === listingId);
  if (!listing || listing.hiddenByOwner) return;
  await setListingVisibility(listingId, { available: true });
}
