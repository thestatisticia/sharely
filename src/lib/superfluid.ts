import { parseG$ } from "./format";

const SECONDS_PER_DAY = BigInt(86_400);

/** G$ per second for a given daily rate (18 decimals). Streams continuously — not once per day. */
export function dailyRateToFlowRate(dailyRateG$: number): bigint {
  const dailyWei = parseG$(dailyRateG$);
  return dailyWei / SECONDS_PER_DAY;
}

/** Total streamed over N days at a daily rate. */
export function streamedTotal(dailyRateG$: number, days: number): bigint {
  return parseG$(dailyRateG$ * days);
}

/** G$ streamed so far at a constant flow rate since stream start. */
export function streamedAmountWei(
  flowRate: bigint,
  streamStartedAtIso: string,
  atMs: number = Date.now(),
): bigint {
  const startMs = new Date(streamStartedAtIso).getTime();
  if (!Number.isFinite(startMs)) return BigInt(0);
  const elapsedSec = BigInt(Math.max(0, Math.floor((atMs - startMs) / 1000)));
  return flowRate * elapsedSec;
}

export function rentalPaymentCapWei(
  dailyRateG$: number,
  days: number,
): bigint {
  return streamedTotal(dailyRateG$, days);
}

export function hasReachedRentalPaymentCap(
  flowRate: bigint,
  streamStartedAtIso: string,
  dailyRateG$: number,
  days: number,
  atMs: number = Date.now(),
): boolean {
  const capWei = rentalPaymentCapWei(dailyRateG$, days);
  return (
    streamedAmountWei(flowRate, streamStartedAtIso, atMs) >= capWei
  );
}

export function flowRateLabel(dailyRateG$: number): string {
  const perDay = dailyRateG$.toLocaleString();
  return `${perDay} G$/day streamed`;
}
