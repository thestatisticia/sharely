import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { ItemCategory, Listing } from "@/lib/types";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase is not configured");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ListingRow = {
  id: string;
  title: string;
  description: string;
  category: ItemCategory;
  image_url: string;
  daily_rate_g: number;
  deposit_g: number;
  location: string;
  area: string | null;
  distance_km: number;
  owner_address: string;
  owner_name: string;
  available: boolean;
  created_at: string;
};

export function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    imageUrl: row.image_url,
    dailyRateG$: Number(row.daily_rate_g),
    depositG$: Number(row.deposit_g),
    location: row.location,
    area: row.area ?? undefined,
    distanceKm: Number(row.distance_km),
    ownerAddress: row.owner_address as `0x${string}`,
    ownerName: row.owner_name,
    createdAt: row.created_at,
    available: row.available,
  };
}

export function listingToRow(listing: Listing): ListingRow {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    image_url: listing.imageUrl,
    daily_rate_g: listing.dailyRateG$,
    deposit_g: listing.depositG$,
    location: listing.location,
    area: listing.area ?? null,
    distance_km: listing.distanceKm,
    owner_address: listing.ownerAddress,
    owner_name: listing.ownerName,
    available: listing.available,
    created_at: listing.createdAt,
  };
}
