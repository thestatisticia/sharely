import { formatShortDate } from "@/lib/format";
import type { Rental } from "@/lib/types";

export function getAvailableAgainDate(rental: Rental): string | null {
  if (rental.endDate) {
    const ms = new Date(rental.endDate).getTime();
    if (Number.isFinite(ms)) return formatShortDate(rental.endDate);
  }
  if (rental.startDate) {
    const end = new Date(rental.startDate);
    end.setDate(end.getDate() + rental.days);
    return formatShortDate(end.toISOString());
  }
  return null;
}

export function needsRenterAction(
  rental: Rental,
  wallet: string | undefined,
): boolean {
  if (!wallet) return false;
  return (
    rental.renterAddress.toLowerCase() === wallet.toLowerCase() &&
    Boolean(rental.bookingId) &&
    !rental.flowTxHash &&
    !rental.streamStartedAt &&
    rental.status !== "completed" &&
    Boolean(rental.ownerHandoverAt)
  );
}

export function countRenterActions(
  rentals: Rental[],
  wallet: string | undefined,
): number {
  return rentals.filter((r) => needsRenterAction(r, wallet)).length;
}
