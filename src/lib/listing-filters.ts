import type { Listing } from "@/lib/types";

/** Demo seed owners cannot receive on-chain payments. */
const DEMO_OWNER = /^0x0{39}[0-9a-f]$/i;

export function isDemoListing(listing: Listing): boolean {
  return (
    listing.id.startsWith("seed-") ||
    DEMO_OWNER.test(listing.ownerAddress)
  );
}

export function isPublishedListing(listing: Listing): boolean {
  return !isDemoListing(listing);
}
