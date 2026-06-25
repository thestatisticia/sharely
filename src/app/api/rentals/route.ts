import { NextResponse } from "next/server";

import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  rentalToRow,
  rowToRental,
} from "@/lib/supabase/server";
import { getRentalsForWallet } from "@/lib/store";
import type { Rental } from "@/lib/types";

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
    return NextResponse.json(
      getRentalsForWallet(wallet as `0x${string}`),
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .or(
        `renter_address.eq.${wallet},owner_address.eq.${wallet}`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      const missingTable =
        error.message.includes("schema cache") ||
        error.message.includes("does not exist");
      if (missingTable) {
        return NextResponse.json(
          getRentalsForWallet(wallet as `0x${string}`),
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const remote = (data ?? []).map(rowToRental);
    const remoteIds = new Set(remote.map((r) => r.id));
    const local = getRentalsForWallet(wallet as `0x${string}`).filter(
      (r) => !remoteIds.has(r.id),
    );

    return NextResponse.json([...remote, ...local]);
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
    const rental = (await request.json()) as Rental;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("rentals").insert(rentalToRow(rental));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: rental.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
