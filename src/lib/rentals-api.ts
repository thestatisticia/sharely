import type { Rental } from "@/lib/types";
import {
  getRentals,
  getRentalsForWallet,
  saveRental,
  updateRental as updateLocalRental,
} from "@/lib/store";
import { mergeRentalsWithLocal } from "@/lib/rental-merge";
import { sanitizeRentalStreamFields } from "@/lib/rental-booking-stream";
import { isRemoteListingsEnabled, setListingVisibility } from "@/lib/listings-api";

export function useRemoteRentals(): boolean {
  return isRemoteListingsEnabled();
}

export async function fetchRentalsForWallet(
  wallet: `0x${string}`,
): Promise<Rental[]> {
  if (isRemoteListingsEnabled()) {
    const res = await fetch(
      `/api/rentals?wallet=${encodeURIComponent(wallet)}`,
      { cache: "no-store" },
    );
    const data: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : "Could not load rentals";
      throw new Error(message);
    }

    if (!Array.isArray(data)) {
      throw new Error("Invalid rentals response");
    }

    const remote = data as Rental[];
    const local = getRentalsForWallet(wallet);
    return mergeRentalsWithLocal(remote, local);
  }

  return getRentalsForWallet(wallet).map(sanitizeRentalStreamFields);
}

export async function fetchActiveRentalForListing(
  listingId: string,
): Promise<import("@/lib/types").Rental | null> {
  if (!isRemoteListingsEnabled()) {
    const { getRentals } = await import("@/lib/store");
    const rental =
      getRentals().find(
        (r) =>
          r.listingId === listingId &&
          r.status !== "completed" &&
          Boolean(r.bookingId),
      ) ?? null;
    return rental ? sanitizeRentalStreamFields(rental) : null;
  }

  const res = await fetch(`/api/rentals/by-listing/${listingId}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { rental?: import("@/lib/types").Rental | null };
  return data.rental ? sanitizeRentalStreamFields(data.rental) : null;
}

export async function createRental(rental: Rental): Promise<void> {
  saveRental(rental);

  if (isRemoteListingsEnabled()) {
    const res = await fetch("/api/rentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rental),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Could not save rental to server");
    }
  }

  await setListingVisibility(rental.listingId, { available: false }).catch(
    () => {},
  );
}

async function upsertRentalOnServer(rental: Rental): Promise<void> {
  const res = await fetch("/api/rentals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rental),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not sync rental to server");
  }
}

export async function patchRental(
  id: string,
  patch: Partial<
    Pick<
      Rental,
      | "status"
      | "ownerHandoverAt"
      | "startDate"
      | "endDate"
    >
  > &
    Partial<{
      streamStartedAt: string | null;
      streamStoppedAt: string | null;
      flowTxHash: string | null;
      txHash: string | null;
    }>,
  options?: { listingId?: string; relistOnComplete?: boolean; ownerAddress?: `0x${string}` },
): Promise<void> {
  updateLocalRental(id, patch);

  if (
    options?.relistOnComplete &&
    options.listingId &&
    options.ownerAddress &&
    patch.status === "completed"
  ) {
    const { relistAfterRental } = await import("@/lib/listings-api");
    await relistAfterRental(options.listingId, options.ownerAddress).catch(
      () => {},
    );
  }

  if (!isRemoteListingsEnabled()) return;

  const res = await fetch(`/api/rentals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    rental?: Rental;
  };

  if (!res.ok) {
    if (res.status === 404) {
      const rental = getRentals().find((r) => r.id === id);
      if (rental) {
        await upsertRentalOnServer({ ...rental, ...patch } as Rental);
        return;
      }
    }
    throw new Error(body.error ?? "Could not update rental on server");
  }

  if (body.rental) {
    updateLocalRental(id, {
      status: body.rental.status,
      streamStartedAt: body.rental.streamStartedAt ?? null,
      ownerHandoverAt: body.rental.ownerHandoverAt,
      streamStoppedAt: body.rental.streamStoppedAt ?? null,
      flowTxHash: body.rental.flowTxHash ?? null,
      startDate: body.rental.startDate,
      endDate: body.rental.endDate,
      txHash: body.rental.txHash ?? null,
    });
  }
}
