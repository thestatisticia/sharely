export type ItemCategory =
  | "tools"
  | "electronics"
  | "sports"
  | "home"
  | "other";

export type RentalStatus = "active" | "completed" | "pending";

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: ItemCategory;
  imageUrl: string;
  dailyRateG$: number;
  depositG$: number;
  location: string;
  /** Kampala neighborhood for heatmap + filters */
  area?: string;
  distanceKm: number;
  ownerAddress: `0x${string}`;
  ownerName: string;
  createdAt: string;
  available: boolean;
  /** Owner delisted — stay off Explore even after a rental ends. */
  hiddenByOwner?: boolean;
}

export interface Rental {
  id: string;
  listingId: string;
  listingTitle: string;
  renterAddress: `0x${string}`;
  ownerAddress: `0x${string}`;
  days: number;
  dailyRateG$: number;
  totalG$: number;
  depositG$: number;
  status: RentalStatus;
  bookingId?: `0x${string}`;
  txHash?: `0x${string}`;
  escrowTxHash?: `0x${string}`;
  flowTxHash?: `0x${string}`;
  /** When the Superfluid payment stream began (after pickup). */
  streamStartedAt?: string;
  /** Owner confirms physical handover — prompts renter to start stream. */
  ownerHandoverAt?: string;
  /** Renter ended the payment stream (auto or manual). */
  streamStoppedAt?: string | null;
  createdAt: string;
  startDate: string;
  endDate: string;
}
