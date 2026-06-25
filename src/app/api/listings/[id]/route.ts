import { NextResponse } from "next/server";

import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  rowToListing,
} from "@/lib/supabase/server";
import { isPublishedListing } from "@/lib/listing-filters";
import { isPublicListing } from "@/lib/listing-visibility";
import { hasRenderableImage } from "@/lib/imageUrl";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data) {
      const listing = rowToListing(data);
      if (!isPublishedListing(listing) || !hasRenderableImage(listing.imageUrl)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (!isPublicListing(listing)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(listing);
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    available?: boolean;
    hiddenByOwner?: boolean;
  };

  if (
    typeof body.available !== "boolean" &&
    typeof body.hiddenByOwner !== "boolean"
  ) {
    return NextResponse.json(
      { error: "available or hiddenByOwner (boolean) is required" },
      { status: 400 },
    );
  }

  const rowPatch: Record<string, boolean> = {};
  if (typeof body.available === "boolean") rowPatch.available = body.available;
  if (typeof body.hiddenByOwner === "boolean") {
    rowPatch.hidden_by_owner = body.hiddenByOwner;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, localOnly: true });
  }

  try {
    const supabase = getSupabaseAdmin();
    let { data, error } = await supabase
      .from("listings")
      .update(rowPatch)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error?.message.includes("hidden_by_owner") && rowPatch.hidden_by_owner !== undefined) {
      const { hidden_by_owner: _hidden, ...withoutHidden } = rowPatch;
      const retry = await supabase
        .from("listings")
        .update(withoutHidden)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json(rowToListing(data));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
