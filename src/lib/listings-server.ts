import { hasRenderableImage } from "@/lib/imageUrl";
import { isPublishedListing } from "@/lib/listing-filters";
import { isPublicListing } from "@/lib/listing-visibility";
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
  if (message.includes("stream_stopped_at")) {
    return "Database needs an update. Run supabase/rentals-migration-stream-stopped.sql in Supabase SQL Editor, then try again.";
  }
  if (message.includes("hidden_by_owner")) {
    return "Database needs an update. Run supabase/listings-hidden-column.sql in Supabase SQL Editor, then try hiding again.";
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
      query = query.eq("available", true).eq("hidden_by_owner", false);
    }

    const { data, error } = await query;

    if (error) {
      const missingTable =
        error.message.includes("schema cache") ||
        error.message.includes("does not exist");
      const missingHidden = error.message.includes("hidden_by_owner");
      if (missingTable) return [];
      if (missingHidden && availableOnly) {
        const fallback = await supabase
          .from("listings")
          .select("*")
          .eq("available", true)
          .order("created_at", { ascending: false });
        if (fallback.error) throw new Error(fallback.error.message);
        return (fallback.data ?? [])
          .map(rowToListing)
          .filter(
            (listing) =>
              isPublishedListing(listing) &&
              hasRenderableImage(listing.imageUrl) &&
              isPublicListing(listing),
          );
      }
      throw new Error(error.message);
    }

    return (data ?? [])
      .map(rowToListing)
      .filter(
        (listing) =>
          isPublishedListing(listing) &&
          hasRenderableImage(listing.imageUrl) &&
          (!availableOnly || isPublicListing(listing)),
      );
  } catch {
    return [];
  }
}
