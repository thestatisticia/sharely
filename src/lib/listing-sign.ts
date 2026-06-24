import type { Listing } from "@/lib/types";

/** Message the lister signs in MetaMask to attest ownership before publishing. */
export function buildListingSignMessage(listing: Listing): string {
  return [
    "SHARELY — List item on Celo",
    "",
    `Listing ID: ${listing.id}`,
    `Title: ${listing.title}`,
    `Daily rate: ${listing.dailyRateG$} G$`,
    `Deposit: ${listing.depositG$} G$`,
    `Area: ${listing.area ?? listing.location}`,
    `Wallet: ${listing.ownerAddress}`,
    `Timestamp: ${listing.createdAt}`,
  ].join("\n");
}
