import type { Rental } from "@/lib/types";

export type RentalLifecycle =
  | "available"
  | "booked"
  | "delivered"
  | "active"
  | "return_pending"
  | "completed";

export function getRentalLifecycle(
  rental: Rental,
  streamActive: boolean,
  depositReleased: boolean,
): RentalLifecycle {
  if (depositReleased || rental.status === "completed") return "completed";
  if (streamActive || rental.streamStartedAt) return "active";
  if (rental.ownerHandoverAt) return "delivered";
  if (rental.status === "pending" || rental.bookingId) return "booked";
  return "booked";
}

export const LIFECYCLE_LABELS: Record<
  RentalLifecycle,
  { label: string; tone: "success" | "warning" | "muted" }
> = {
  available: { label: "Available", tone: "success" },
  booked: { label: "Booked — deposit locked", tone: "warning" },
  delivered: { label: "Delivered — awaiting payment", tone: "warning" },
  active: { label: "Active rental", tone: "success" },
  return_pending: { label: "Return pending", tone: "warning" },
  completed: { label: "Completed", tone: "muted" },
};
