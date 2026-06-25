import { hasRenderableImage } from "@/lib/imageUrl";
import { isPublishedListing } from "@/lib/listing-filters";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  rowToListing,
} from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";

export function formatSupabaseError(message: string): string {
  if (
    message.includes("owner_handover_at") ||
    message.includes("owner handover")
  ) {
    return "Database needs an update. Run supabase/rentals-migration-handover.sql in Supabase SQL Editor, then try again.";
  }
  return message;
}

export async function fetchPublishedListings(
  options?: { availableOnly?: boolean },
): Promise<Listing[]> {
  const availableOnly = options?.availableOnly ?? true;

  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (availableOnly) {
      query = query.eq("available", true);
    }

    const { data, error } = await query;

    if (error) {
      const missingTable =
        error.message.includes("schema cache") ||
        error.message.includes("does not exist");
      if (missingTable) return [];
      throw new Error(error.message);
    }

    return (data ?? [])
      .map(rowToListing)
      .filter(
        (listing) =>
          isPublishedListing(listing) && hasRenderableImage(listing.imageUrl),
      );
  } catch {
    return [];
  }
}
