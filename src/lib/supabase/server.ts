import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { ItemCategory, Listing, Rental, RentalStatus } from "@/lib/types";

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

export type RentalRow = {
  id: string;
  listing_id: string;
  listing_title: string;
  renter_address: string;
  owner_address: string;
  days: number;
  daily_rate_g: number;
  total_g: number;
  deposit_g: number;
  status: RentalStatus;
  booking_id: string | null;
  tx_hash: string | null;
  escrow_tx_hash: string | null;
  flow_tx_hash: string | null;
  stream_started_at: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
};

export function rowToRental(row: RentalRow): Rental {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    renterAddress: row.renter_address as `0x${string}`,
    ownerAddress: row.owner_address as `0x${string}`,
    days: row.days,
    dailyRateG$: Number(row.daily_rate_g),
    totalG$: Number(row.total_g),
    depositG$: Number(row.deposit_g),
    status: row.status,
    bookingId: row.booking_id as `0x${string}` | undefined,
    txHash: row.tx_hash as `0x${string}` | undefined,
    escrowTxHash: row.escrow_tx_hash as `0x${string}` | undefined,
    flowTxHash: row.flow_tx_hash as `0x${string}` | undefined,
    streamStartedAt: row.stream_started_at ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  };
}

export function rentalToRow(rental: Rental): RentalRow {
  return {
    id: rental.id,
    listing_id: rental.listingId,
    listing_title: rental.listingTitle,
    renter_address: rental.renterAddress.toLowerCase(),
    owner_address: rental.ownerAddress.toLowerCase(),
    days: rental.days,
    daily_rate_g: rental.dailyRateG$,
    total_g: rental.totalG$,
    deposit_g: rental.depositG$,
    status: rental.status,
    booking_id: rental.bookingId ?? null,
    tx_hash: rental.txHash ?? null,
    escrow_tx_hash: rental.escrowTxHash ?? null,
    flow_tx_hash: rental.flowTxHash ?? null,
    stream_started_at: rental.streamStartedAt ?? null,
    start_date: rental.startDate,
    end_date: rental.endDate,
    created_at: rental.createdAt,
  };
}

export function rentalPatchToRow(
  patch: Partial<Rental>,
): Partial<RentalRow> {
  const row: Partial<RentalRow> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.flowTxHash !== undefined) row.flow_tx_hash = patch.flowTxHash;
  if (patch.txHash !== undefined) row.tx_hash = patch.txHash;
  if (patch.streamStartedAt !== undefined) {
    row.stream_started_at = patch.streamStartedAt;
  }
  if (patch.startDate !== undefined) row.start_date = patch.startDate;
  if (patch.endDate !== undefined) row.end_date = patch.endDate;
  return row;
}
