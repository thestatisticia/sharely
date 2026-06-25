import { NextResponse } from "next/server";

import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  rentalPatchToRow,
  rowToRental,
} from "@/lib/supabase/server";
import { updateRental as updateLocalRental } from "@/lib/store";
import type { Rental } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const patch = (await request.json()) as Partial<Rental>;

  updateLocalRental(id, patch);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const supabase = getSupabaseAdmin();
    const rowPatch = rentalPatchToRow(patch);
    if (Object.keys(rowPatch).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("rentals")
      .update(rowPatch)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      const missingTable =
        error.message.includes("schema cache") ||
        error.message.includes("does not exist");
      if (missingTable) {
        return NextResponse.json({ ok: true, localOnly: true });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, rental: data ? rowToRental(data) : null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
