import type { Listing } from "@/lib/types";

/** Shown on home / explore — available and not owner-hidden. */
export function isPublicListing(listing: Listing): boolean {
  return listing.available && !listing.hiddenByOwner;
}
