import { NextResponse } from "next/server";

import { hasRenderableImage } from "@/lib/imageUrl";
import { fetchPublishedListings } from "@/lib/listings-server";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  listingToRow,
} from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  try {
    const listings = await fetchPublishedListings({ availableOnly: true });
    return NextResponse.json(listings, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured on server" },
      { status: 503 },
    );
  }

  try {
    const listing = (await request.json()) as Listing;
    if (!hasRenderableImage(listing.imageUrl)) {
      return NextResponse.json(
        { error: "Listing image URL is required and must be a valid link." },
        { status: 400 },
      );
    }
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("listings")
      .insert(listingToRow(listing));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: listing.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
