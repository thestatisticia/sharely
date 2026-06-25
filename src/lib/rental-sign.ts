import type { Rental } from "@/lib/types";

/** Owner signs in MetaMask to confirm physical delivery. */
export function buildHandoverSignMessage(rental: Rental, timestamp: string): string {
  return [
    "SHARELY — Confirm item delivery",
    "",
    `Rental ID: ${rental.id}`,
    `Listing: ${rental.listingTitle}`,
    `Booking ID: ${rental.bookingId ?? "n/a"}`,
    `Renter: ${rental.renterAddress}`,
    `Owner: ${rental.ownerAddress}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}

/** Renter signs before starting the Superfluid payment stream. */
export function buildStreamStartSignMessage(rental: Rental, timestamp: string): string {
  return [
    "SHARELY — Start rental payment stream",
    "",
    `Rental ID: ${rental.id}`,
    `Listing: ${rental.listingTitle}`,
    `Daily rate: ${rental.dailyRateG$} G$`,
    `Days: ${rental.days}`,
    `Owner: ${rental.ownerAddress}`,
    `Renter: ${rental.renterAddress}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}
