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
  const streamStarted = Boolean(rental.streamStartedAt);

  if (!streamStarted) {
    return {
      phase: "pending",
      progress: 0,
      earnedG$: 0,
      totalRentalG$: totalRentalG$,
      daysElapsed: 0,
      daysTotal,
    };
  }

  const startMs = new Date(rental.streamStartedAt!).getTime();
  const endMs = new Date(rental.endDate).getTime();
  const now = Date.now();
  const span = Math.max(endMs - startMs, 1);
  const elapsed = Math.min(Math.max(now - startMs, 0), span);
  const progress = elapsed / span;
  const daysElapsed = elapsed / 86_400_000;
  const earnedG$ = Math.min(
    rental.dailyRateG$ * daysElapsed,
    totalRentalG$,
  );
  const cappedProgress = Math.min(progress, 1);

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

  if (!streamActive) {
    return {
      phase: "stopped",
      progress: cappedProgress,
      earnedG$,
      totalRentalG$: totalRentalG$,
      daysElapsed,
      daysTotal,
    };
  }

  return {
    phase: "streaming",
    progress: cappedProgress,
    earnedG$,
    totalRentalG$: totalRentalG$,
    daysElapsed,
    daysTotal,
  };
}
