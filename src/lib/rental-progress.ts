import type { Rental } from "@/lib/types";

export type RentalProgress = {
  phase: "pending" | "streaming" | "stopped" | "complete";
  progress: number;
  earnedG$: number;
  totalRentalG$: number;
  daysElapsed: number;
  daysTotal: number;
};

export function getRentalProgress(
  rental: Rental,
  streamActive: boolean,
  depositReleased: boolean,
): RentalProgress {
  const totalRentalG$ = rental.dailyRateG$ * rental.days;
  const daysTotal = rental.days;

  if (rental.status === "pending" && !rental.flowTxHash && !streamActive) {
    return {
      phase: "pending",
      progress: 0,
      earnedG$: 0,
      totalRentalG$: totalRentalG$,
      daysElapsed: 0,
      daysTotal,
    };
  }

  if (depositReleased && !streamActive) {
    return {
      phase: "complete",
      progress: 1,
      earnedG$: totalRentalG$,
      totalRentalG$: totalRentalG$,
      daysElapsed: daysTotal,
      daysTotal,
    };
  }

  const startMs = new Date(
    rental.streamStartedAt ?? rental.startDate,
  ).getTime();
  const endMs = new Date(rental.endDate).getTime();
  const now = Date.now();
  const span = Math.max(endMs - startMs, 1);
  const elapsed = Math.min(Math.max(now - startMs, 0), span);
  const progress = elapsed / span;
  const daysElapsed = elapsed / 86_400_000;

  return {
    phase: streamActive ? "streaming" : "stopped",
    progress,
    earnedG$: rental.dailyRateG$ * daysElapsed,
    totalRentalG$: totalRentalG$,
    daysElapsed,
    daysTotal,
  };
}
