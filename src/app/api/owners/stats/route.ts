import { NextResponse } from "next/server";

import {
  getSupabaseAdmin,
  isSupabaseConfigured,
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
    return NextResponse.json({
      listingsCount: 0,
      completedRentals: 0,
      activeRentals: 0,
      totalRentals: 0,
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    const [listingsRes, rentalsRes] = await Promise.all([
      supabase.from("listings").select("owner_address"),
      supabase.from("rentals").select("owner_address, status"),
    ]);

    if (listingsRes.error) {
      return NextResponse.json({ error: listingsRes.error.message }, { status: 500 });
    }
    if (rentalsRes.error) {
      return NextResponse.json({ error: rentalsRes.error.message }, { status: 500 });
    }

    const listingsCount = (listingsRes.data ?? []).filter(
      (row) => row.owner_address.toLowerCase() === wallet,
    ).length;

    const rentals = (rentalsRes.data ?? []).filter(
      (row) => row.owner_address.toLowerCase() === wallet,
    );

    const completedRentals = rentals.filter((r) => r.status === "completed").length;
    const activeRentals = rentals.filter((r) => r.status !== "completed").length;

    return NextResponse.json(
      {
        listingsCount,
        completedRentals,
        activeRentals,
        totalRentals: rentals.length,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
