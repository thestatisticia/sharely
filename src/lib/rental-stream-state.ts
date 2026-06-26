import {
  flowBelongsToRentalBooking,
  isLatestOpenBookingForPair,
  streamStartedForCurrentBooking,
  streamStoppedForCurrentBooking,
} from "@/lib/rental-booking-stream";
import { dailyRateToFlowRate } from "@/lib/superfluid";
import { rentalDailyRate } from "@/lib/rental-stream";
import type { Rental } from "@/lib/types";

export function flowRateMatchesRental(
  flowRate: bigint | undefined,
  dailyRateG$: number,
): boolean {
  if (flowRate === undefined || flowRate <= BigInt(0)) return false;
  const expected = dailyRateToFlowRate(dailyRateG$);
  if (flowRate === expected) return true;
  const diff =
    flowRate > expected ? flowRate - expected : expected - flowRate;
  return diff <= expected / BigInt(10_000) || diff <= BigInt(1);
}

/** Flow must have been created/updated at or after owner handover for this booking. */
export function flowStartedAfterHandover(
  flowLastUpdatedSec: bigint | undefined,
  ownerHandoverAt: string | undefined,
): boolean {
  if (!ownerHandoverAt || flowLastUpdatedSec === undefined) return false;
  const handoverMs = new Date(ownerHandoverAt).getTime();
  return Number(flowLastUpdatedSec) * 1000 >= handoverMs - 120_000;
}

export function hasRecordedStreamStart(rental: Rental): boolean {
  return streamStartedForCurrentBooking(rental);
}

export function isStreamActiveForRental(
  rental: Rental,
  onChainFlowActive: boolean,
  flowRate: bigint | undefined,
  flowLastUpdatedSec: bigint | undefined,
  peerRentals: Rental[] = [],
): boolean {
  if (!onChainFlowActive) return false;
  if (rental.status === "completed") return false;
  if (streamStoppedForCurrentBooking(rental)) return false;
  if (!flowBelongsToRentalBooking(rental, flowLastUpdatedSec)) return false;

  const dailyRate = rentalDailyRate(rental);
  if (!flowRateMatchesRental(flowRate, dailyRate)) return false;

  if (peerRentals.length > 0 && !isLatestOpenBookingForPair(rental, peerRentals)) {
    return false;
  }

  if (streamStartedForCurrentBooking(rental)) return true;

  return (
    Boolean(rental.ownerHandoverAt) &&
    !rental.streamStartedAt &&
    flowStartedAfterHandover(flowLastUpdatedSec, rental.ownerHandoverAt)
  );
}

export function canSyncStreamFromChain(
  rental: Rental,
  onChainFlowActive: boolean,
  flowRate: bigint | undefined,
  flowLastUpdatedSec: bigint | undefined,
  peerRentals: Rental[] = [],
): boolean {
  if (hasRecordedStreamStart(rental)) return false;
  if (!rental.ownerHandoverAt || rental.status === "completed") return false;
  if (streamStoppedForCurrentBooking(rental)) return false;
  if (peerRentals.length > 0 && !isLatestOpenBookingForPair(rental, peerRentals)) {
    return false;
  }

  return isStreamActiveForRental(
    rental,
    onChainFlowActive,
    flowRate,
    flowLastUpdatedSec,
    peerRentals,
  );
}
