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

export type OwnerRentalPhase =
  | "cancelled"
  | "awaiting_handover"
  | "awaiting_renter_stream"
  | "streaming"
  | "awaiting_return"
  | "complete";

export type RenterRentalPhase =
  | "cancelled"
  | "awaiting_pickup"
  | "ready_to_start"
  | "streaming"
  | "payments_ended"
  | "complete";

export function isBookingCancelledBeforePickup(rental: Rental): boolean {
  return (
    rental.status === "completed" &&
    !rental.ownerHandoverAt &&
    !rental.flowTxHash &&
    !rental.streamStartedAt
  );
}

export function getRenterRentalPhase(
  rental: Rental,
  chain: {
    streamActive: boolean;
    hasRecordedStreamStart: boolean;
    depositReleased: boolean;
  },
): RenterRentalPhase {
  if (chain.depositReleased) return "complete";
  if (isBookingCancelledBeforePickup(rental)) return "cancelled";
  if (chain.streamActive) return "streaming";
  if (chain.hasRecordedStreamStart || rental.streamStoppedAt) {
    return "payments_ended";
  }
  if (rental.ownerHandoverAt) return "ready_to_start";
  return "awaiting_pickup";
}

export function getOwnerRentalPhase(
  rental: Rental,
  chain: {
    streamActive: boolean;
    hasRecordedStreamStart: boolean;
    depositReleased: boolean;
  },
): OwnerRentalPhase {
  if (chain.depositReleased) return "complete";
  if (isBookingCancelledBeforePickup(rental)) return "cancelled";
  if (chain.streamActive) return "streaming";
  if (chain.hasRecordedStreamStart || rental.streamStoppedAt) {
    return "awaiting_return";
  }
  if (!rental.ownerHandoverAt) return "awaiting_handover";
  return "awaiting_renter_stream";
}

export function needsOwnerHandover(
  rental: Rental,
  wallet: string | undefined,
): boolean {
  if (!wallet) return false;
  return (
    rental.ownerAddress.toLowerCase() === wallet.toLowerCase() &&
    Boolean(rental.bookingId) &&
    !rental.ownerHandoverAt &&
    !rental.streamStoppedAt &&
    rental.status !== "completed"
  );
}

export function needsOwnerReturnConfirm(
  rental: Rental,
  wallet: string | undefined,
): boolean {
  if (!wallet) return false;
  return (
    rental.ownerAddress.toLowerCase() === wallet.toLowerCase() &&
    Boolean(rental.streamStoppedAt) &&
    rental.status !== "completed"
  );
}

export function needsOwnerAction(
  rental: Rental,
  wallet: string | undefined,
): boolean {
  return (
    needsOwnerHandover(rental, wallet) ||
    needsOwnerReturnConfirm(rental, wallet)
  );
}

export function countOwnerActions(
  rentals: Rental[],
  wallet: string | undefined,
): number {
  return rentals.filter((r) => needsOwnerAction(r, wallet)).length;
}

export function countPendingRentalActions(
  rentals: Rental[],
  wallet: string | undefined,
): number {
  return (
    countRenterActions(rentals, wallet) + countOwnerActions(rentals, wallet)
  );
}

export function canRenterCancelBeforePickup(
  rental: Rental,
  wallet: string | undefined,
): boolean {
  if (!wallet) return false;
  return (
    rental.renterAddress.toLowerCase() === wallet.toLowerCase() &&
    Boolean(rental.bookingId) &&
    !rental.ownerHandoverAt &&
    !rental.flowTxHash &&
    !rental.streamStartedAt &&
    rental.status !== "completed"
  );
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
    !rental.streamStoppedAt &&
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
