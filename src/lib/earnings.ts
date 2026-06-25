import { getRentalProgress } from "@/lib/rental-progress";
import type { Rental } from "@/lib/types";

export function computeOwnerEarnings(
  rentals: Rental[],
  ownerAddress: string,
) {
  const lower = ownerAddress.toLowerCase();
  const mine = rentals.filter(
    (r) => r.ownerAddress.toLowerCase() === lower,
  );

  const active = mine.filter((r) => r.status !== "completed");
  const completed = mine.filter((r) => r.status === "completed");

  const activeEstimated = active.reduce((sum, rental) => {
    const streaming = Boolean(rental.flowTxHash);
    const progress = getRentalProgress(rental, streaming, false);
    return sum + progress.earnedG$;
  }, 0);

  const completedTotal = completed.reduce(
    (sum, r) => sum + r.dailyRateG$ * r.days,
    0,
  );

  return {
    activeRentals: active.length,
    activeEstimatedG$: activeEstimated,
    totalEarnedG$: completedTotal + activeEstimated,
    completedRentals: completed.length,
  };
}
