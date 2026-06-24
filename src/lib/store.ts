import type { Listing, Rental } from "./types";
import { LISTING_PHOTOS } from "./listing-images";

const LISTINGS_KEY = "sharely_listings";
const RENTALS_KEY = "sharely_rentals";

export const SEED_LISTINGS: Listing[] = [
  {
    id: "seed-1",
    title: "Cordless drill kit",
    description:
      "18V drill with bits and carrying case. Ideal for shelf mounting or quick home fixes in Ntinda.",
    category: "tools",
    imageUrl: LISTING_PHOTOS.drill,
    dailyRateG$: 120,
    depositG$: 800,
    location: "Ntinda, Kampala",
    area: "Ntinda",
    distanceKm: 0.6,
    ownerAddress: "0x0000000000000000000000000000000000000001",
    ownerName: "Sarah N.",
    createdAt: new Date().toISOString(),
    available: true,
  },
  {
    id: "seed-2",
    title: "Camping tent (4-person)",
    description:
      "Water-resistant tent used twice. Includes stakes and compact carry bag — great for Lake Victoria weekends.",
    category: "sports",
    imageUrl: LISTING_PHOTOS.tent,
    dailyRateG$: 200,
    depositG$: 1500,
    location: "Kololo, Kampala",
    area: "Kololo",
    distanceKm: 1.1,
    ownerAddress: "0x0000000000000000000000000000000000000002",
    ownerName: "James O.",
    createdAt: new Date().toISOString(),
    available: true,
  },
  {
    id: "seed-3",
    title: "Ring light + phone mount",
    description:
      "10-inch LED ring light for content creation or video calls. USB powered — popular with Bukoto creators.",
    category: "electronics",
    imageUrl: LISTING_PHOTOS.ringLight,
    dailyRateG$: 80,
    depositG$: 400,
    location: "Bukoto, Kampala",
    area: "Bukoto",
    distanceKm: 1.8,
    ownerAddress: "0x0000000000000000000000000000000000000003",
    ownerName: "Amina K.",
    createdAt: new Date().toISOString(),
    available: true,
  },
  {
    id: "seed-4",
    title: "Pressure washer",
    description:
      "Electric pressure washer for driveways, bikes, and outdoor furniture. Pick up in Makindye.",
    category: "tools",
    imageUrl: LISTING_PHOTOS.pressureWasher,
    dailyRateG$: 350,
    depositG$: 2000,
    location: "Makindye, Kampala",
    area: "Makindye",
    distanceKm: 2.3,
    ownerAddress: "0x0000000000000000000000000000000000000004",
    ownerName: "Peter M.",
    createdAt: new Date().toISOString(),
    available: true,
  },
  {
    id: "seed-5",
    title: "Portable generator (2.5 kVA)",
    description:
      "Reliable backup power for events or load-shedding evenings. Fuel not included.",
    category: "electronics",
    imageUrl: LISTING_PHOTOS.generator,
    dailyRateG$: 450,
    depositG$: 3000,
    location: "Kawempe, Kampala",
    area: "Kawempe",
    distanceKm: 3.2,
    ownerAddress: "0x0000000000000000000000000000000000000005",
    ownerName: "David W.",
    createdAt: new Date().toISOString(),
    available: true,
  },
  {
    id: "seed-6",
    title: "Extension ladder (3.5m)",
    description:
      "Aluminium ladder for painting, gutter cleaning, or signage installs around Nakasero.",
    category: "home",
    imageUrl: LISTING_PHOTOS.ladder,
    dailyRateG$: 150,
    depositG$: 900,
    location: "Nakasero, Kampala",
    area: "Nakasero",
    distanceKm: 0.9,
    ownerAddress: "0x0000000000000000000000000000000000000006",
    ownerName: "Grace A.",
    createdAt: new Date().toISOString(),
    available: true,
  },
];

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
  localStorage.setItem(key, JSON.stringify(value));
}

export function getListings(): Listing[] {
  const custom = readJson<Listing[]>(LISTINGS_KEY, []);
  const ids = new Set(custom.map((l) => l.id));
  const seeds = SEED_LISTINGS.filter((l) => !ids.has(l.id));
  return [...custom, ...seeds].sort(
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
  patch: Partial<Pick<Rental, "status">>,
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
