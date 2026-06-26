import type { Listing, Rental } from "./types";

const LISTINGS_KEY = "sharely_listings";
const RENTALS_KEY = "sharely_rentals";

/** @deprecated Demo listings removed — only Supabase listings are shown in production. */
export const SEED_LISTINGS: Listing[] = [];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getListings(): Listing[] {
  return readJson<Listing[]>(LISTINGS_KEY, []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getListingById(id: string): Listing | undefined {
  return getListings().find((l) => l.id === id);
}

export function saveListing(listing: Listing) {
  const custom = readJson<Listing[]>(LISTINGS_KEY, []);
  writeJson(LISTINGS_KEY, [listing, ...custom]);
}

export function updateListingVisibility(
  id: string,
  patch: { available?: boolean; hiddenByOwner?: boolean },
) {
  const custom = readJson<Listing[]>(LISTINGS_KEY, []);
  const next = custom.map((l) => (l.id === id ? { ...l, ...patch } : l));
  writeJson(LISTINGS_KEY, next);
}

/** @deprecated Use updateListingVisibility */
export function updateListingAvailability(id: string, available: boolean) {
  updateListingVisibility(id, { available });
}

export function getRentals(): Rental[] {
  return readJson<Rental[]>(RENTALS_KEY, []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getRentalsForWallet(
  wallet: `0x${string}` | undefined,
): Rental[] {
  if (!wallet) return [];
  const lower = wallet.toLowerCase();
  return getRentals().filter(
    (r) =>
      r.renterAddress.toLowerCase() === lower ||
      r.ownerAddress.toLowerCase() === lower,
  );
}

export function saveRental(rental: Rental) {
  const rentals = getRentals();
  writeJson(RENTALS_KEY, [rental, ...rentals]);
}

export function updateRental(
  id: string,
  patch: Partial<
    Pick<
      Rental,
      | "status"
      | "streamStartedAt"
      | "ownerHandoverAt"
      | "streamStoppedAt"
      | "flowTxHash"
      | "startDate"
      | "endDate"
      | "txHash"
    >
  >,
) {
  const rentals = getRentals();
  const next = rentals.map((r) => (r.id === id ? { ...r, ...patch } : r));
  writeJson(RENTALS_KEY, next);
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
