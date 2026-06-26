import type { Rental } from "@/lib/types";

/** Clock skew between wallets, server, and chain. */
export const HANDOVER_SLACK_MS = 120_000;

/** After a stream tx, wait for RPC before treating flow as stopped. */
export const CHAIN_CONFIRM_GRACE_MS = 180_000;

/** Do not auto-stop until the stream has run at least this long. */
export const MIN_STREAM_RUNTIME_MS = 60_000;

export function streamTimestampBelongsToHandover(
  iso: string | null | undefined,
  handoverAt: string | undefined,
): boolean {
  if (!iso || !handoverAt) return false;
  const handoverMs = new Date(handoverAt).getTime();
  const tsMs = new Date(iso).getTime();
  if (!Number.isFinite(handoverMs) || !Number.isFinite(tsMs)) return false;
  return tsMs >= handoverMs - HANDOVER_SLACK_MS;
}

export function streamStartedForCurrentBooking(rental: Rental): boolean {
  return streamTimestampBelongsToHandover(
    rental.streamStartedAt,
    rental.ownerHandoverAt,
  );
}

export function streamStoppedForCurrentBooking(rental: Rental): boolean {
  if (!streamTimestampBelongsToHandover(rental.streamStoppedAt, rental.ownerHandoverAt)) {
    return false;
  }
  if (!streamStartedForCurrentBooking(rental)) return false;
  const stoppedMs = new Date(rental.streamStoppedAt!).getTime();
  const startedMs = new Date(rental.streamStartedAt!).getTime();
  return stoppedMs >= startedMs - HANDOVER_SLACK_MS;
}

export function isStreamConfirmingOnChain(
  rental: Rental,
  chain: { flowLoading: boolean },
): boolean {
  if (chain.flowLoading) return true;
  if (!rental.flowTxHash || !streamStartedForCurrentBooking(rental)) return false;
  if (rental.streamStoppedAt) return false;
  const ageMs = Date.now() - new Date(rental.streamStartedAt!).getTime();
  return ageMs < CHAIN_CONFIRM_GRACE_MS;
}

/** Cap timing: prefer on-chain flow start for this booking over stale DB rows. */
export function streamStartIsoForCap(
  rental: Rental,
  flowLastUpdatedSec: bigint | undefined,
): string | undefined {
  if (
    flowLastUpdatedSec !== undefined &&
    streamTimestampBelongsToHandover(
      new Date(Number(flowLastUpdatedSec) * 1000).toISOString(),
      rental.ownerHandoverAt,
    )
  ) {
    return new Date(Number(flowLastUpdatedSec) * 1000).toISOString();
  }
  if (streamStartedForCurrentBooking(rental)) {
    return rental.streamStartedAt!;
  }
  return undefined;
}

export function pickValidStreamStartedAt(
  remote: Rental,
  local: Rental | undefined,
): string | undefined {
  const handoverAt = remote.ownerHandoverAt ?? local?.ownerHandoverAt;
  const candidates: string[] = [];

  if (streamTimestampBelongsToHandover(remote.streamStartedAt, handoverAt)) {
    candidates.push(remote.streamStartedAt!);
  }
  if (
    local &&
    streamTimestampBelongsToHandover(local.streamStartedAt, handoverAt)
  ) {
    candidates.push(local.streamStartedAt!);
  }

  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, iso) =>
    new Date(iso).getTime() > new Date(latest).getTime() ? iso : latest,
  );
}

export function pickValidStreamStoppedAt(
  streamStartedAt: string | undefined,
  remote: Rental,
  local: Rental | undefined,
): string | undefined {
  const handoverAt = remote.ownerHandoverAt ?? local?.ownerHandoverAt;
  const candidates: string[] = [];

  for (const iso of [remote.streamStoppedAt, local?.streamStoppedAt]) {
    if (!streamTimestampBelongsToHandover(iso, handoverAt)) continue;
    if (streamStartedAt) {
      const stoppedMs = new Date(iso!).getTime();
      const startedMs = new Date(streamStartedAt).getTime();
      if (stoppedMs < startedMs - HANDOVER_SLACK_MS) continue;
    }
    candidates.push(iso!);
  }

  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, iso) =>
    new Date(iso).getTime() > new Date(latest).getTime() ? iso : latest,
  );
}

/** Drop stream metadata from a previous booking on the same rental row. */
export function sanitizeRentalStreamFields(rental: Rental): Rental {
  const streamStartedAt = streamStartedForCurrentBooking(rental)
    ? rental.streamStartedAt
    : undefined;
  const withStart = { ...rental, streamStartedAt };
  const streamStoppedAt = streamStoppedForCurrentBooking(withStart)
    ? rental.streamStoppedAt
    : undefined;

  return {
    ...rental,
    streamStartedAt: streamStartedAt ?? undefined,
    streamStoppedAt: streamStoppedAt ?? undefined,
    flowTxHash: streamStartedAt ? rental.flowTxHash : undefined,
    txHash: streamStartedAt ? rental.txHash : undefined,
  };
}
