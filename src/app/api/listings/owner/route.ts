import { NextResponse } from "next/server";

import { hasRenderableImage } from "@/lib/imageUrl";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  rowToListing,
} from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();

  if (!wallet) {
    return NextResponse.json(
      { error: "wallet query parameter required" },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const listings = (data ?? [])
      .filter((row) => row.owner_address.toLowerCase() === wallet)
      .map(rowToListing)
      .filter((listing) => hasRenderableImage(listing.imageUrl));

    return NextResponse.json(listings, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
