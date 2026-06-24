import type { Listing } from "./types";

/** Kampala neighborhoods — launch focus for SHARELY */
export const KAMPALA_AREAS = [
  "Kololo",
  "Nakasero",
  "Ntinda",
  "Bukoto",
  "Makindye",
  "Kawempe",
  "Naguru",
  "Wandegeya",
  "Luzira",
] as const;

export type KampalaArea = (typeof KAMPALA_AREAS)[number];

/** Grid layout for the neighborhood heatmap (row, col) */
export const KAMPALA_HEATMAP_LAYOUT: {
  area: KampalaArea;
  row: number;
  col: number;
}[] = [
  { area: "Naguru", row: 0, col: 0 },
  { area: "Kololo", row: 0, col: 1 },
  { area: "Nakasero", row: 0, col: 2 },
  { area: "Kawempe", row: 1, col: 0 },
  { area: "Wandegeya", row: 1, col: 1 },
  { area: "Ntinda", row: 1, col: 2 },
  { area: "Bukoto", row: 1, col: 3 },
  { area: "Makindye", row: 2, col: 1 },
  { area: "Luzira", row: 2, col: 2 },
];

export const KAMPALA_CITY_LABEL = "Kampala, Uganda";

export function listingArea(listing: Listing): string {
  if (listing.area) return listing.area;
  const first = listing.location.split(",")[0]?.trim();
  return first || listing.location;
}

export function formatKampalaLocation(area: string): string {
  return `${area}, Kampala`;
}

export function countByArea(listings: Listing[] | null | undefined): Record<string, number> {
  const items = Array.isArray(listings) ? listings : [];
  const counts: Record<string, number> = {};
  for (const area of KAMPALA_AREAS) counts[area] = 0;
  for (const listing of items) {
    const area = listingArea(listing);
    if (area in counts) counts[area] += 1;
    else counts[area] = (counts[area] ?? 0) + 1;
  }
  return counts;
}

export function heatIntensity(count: number, max: number): number {
  if (max === 0 || count === 0) return 0;
  return 0.15 + (count / max) * 0.85;
}
