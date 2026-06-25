import { NextResponse } from "next/server";

import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  rowToRental,
} from "@/lib/supabase/server";
import { getRentals } from "@/lib/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ listingId: string }> },
) {
  const { listingId } = await context.params;

  const findActive = (rentals: ReturnType<typeof getRentals>) =>
    rentals.find(
      (r) =>
        r.listingId === listingId &&
        r.status !== "completed" &&
        Boolean(r.bookingId),
    ) ?? null;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ rental: findActive(getRentals()) });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .eq("listing_id", listingId)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      const missingTable =
        error.message.includes("schema cache") ||
        error.message.includes("does not exist");
      if (missingTable) {
        return NextResponse.json({ rental: findActive(getRentals()) });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      rental: data ? rowToRental(data) : findActive(getRentals()),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
