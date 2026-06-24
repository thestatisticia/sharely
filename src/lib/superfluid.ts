import { parseG$ } from "./format";

const SECONDS_PER_DAY = BigInt(86_400);

/** G$ per second for a given daily rate (18 decimals). */
export function dailyRateToFlowRate(dailyRateG$: number): bigint {
  const dailyWei = parseG$(dailyRateG$);
  return dailyWei / SECONDS_PER_DAY;
}

/** Total streamed over N days at a daily rate. */
export function streamedTotal(dailyRateG$: number, days: number): bigint {
  return parseG$(dailyRateG$ * days);
}

export function flowRateLabel(dailyRateG$: number): string {
  const perDay = dailyRateG$.toLocaleString();
  return `${perDay} G$/day streamed`;
}
