import { NextResponse } from "next/server";

import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  listingToRow,
  rowToListing,
} from "@/lib/supabase/server";
import { SEED_LISTINGS } from "@/lib/store";
import type { Listing } from "@/lib/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(SEED_LISTINGS);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("available", true)
      .order("created_at", { ascending: false });

    if (error) {
      const missingTable =
        error.message.includes("schema cache") ||
        error.message.includes("does not exist");
      if (missingTable) {
        return NextResponse.json(SEED_LISTINGS);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const remote = (data ?? []).map(rowToListing);
    const remoteIds = new Set(remote.map((l) => l.id));
    const seeds = SEED_LISTINGS.filter((l) => !remoteIds.has(l.id));

    return NextResponse.json([...remote, ...seeds]);
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
