import { LISTING_PHOTOS } from "@/lib/listing-images";
import type { Listing } from "@/lib/types";

/** Demo seed owners cannot receive on-chain payments. */
const DEMO_OWNER = /^0x0{39}[0-9a-f]$/i;

const STOCK_SEED_IMAGES = new Set<string>(Object.values(LISTING_PHOTOS));

export function isStockSeedImage(imageUrl: string): boolean {
  const normalized = imageUrl.trim();
  if (STOCK_SEED_IMAGES.has(normalized)) return true;
  return [...STOCK_SEED_IMAGES].some((seed) => normalized.startsWith(seed.split("?")[0]!));
}

export function isDemoListing(listing: Listing): boolean {
  return (
    listing.id.startsWith("seed-") ||
    DEMO_OWNER.test(listing.ownerAddress) ||
    isStockSeedImage(listing.imageUrl)
  );
}

export function isPublishedListing(listing: Listing): boolean {
  return !isDemoListing(listing);
}
