import type { Rental } from "@/lib/types";
import {
  getRentalsForWallet,
  saveRental,
  updateRental as updateLocalRental,
} from "@/lib/store";
import { useRemoteListings } from "@/lib/listings-api";

export function useRemoteRentals(): boolean {
  return useRemoteListings();
}

export async function fetchRentalsForWallet(
  wallet: `0x${string}`,
): Promise<Rental[]> {
  if (useRemoteRentals()) {
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

    return data as Rental[];
  }

  return getRentalsForWallet(wallet);
}

export async function createRental(rental: Rental): Promise<void> {
  saveRental(rental);

  if (!useRemoteRentals()) return;

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

export async function patchRental(
  id: string,
  patch: Partial<
    Pick<Rental, "status" | "streamStartedAt" | "flowTxHash" | "startDate" | "endDate" | "txHash">
  >,
): Promise<void> {
  updateLocalRental(id, patch);

  if (!useRemoteRentals()) return;

  const res = await fetch(`/api/rentals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not update rental on server");
  }
}
