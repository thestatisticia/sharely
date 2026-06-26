import type { Rental } from "@/lib/types";

/** Merge browser-local rental patches into API results (server cannot read localStorage). */
export function mergeRentalsWithLocal(
  remote: Rental[],
  local: Rental[],
): Rental[] {
  const localById = new Map(local.map((r) => [r.id, r]));
  const remoteIds = new Set(remote.map((r) => r.id));

  const merged = remote.map((r) => overlayLocalRentalFields(r, localById.get(r.id)));
  const localOnly = local.filter((r) => !remoteIds.has(r.id));

  return [...merged, ...localOnly];
}

function localStreamBelongsToBooking(
  local: Rental,
  handoverAt: string,
): boolean {
  const handoverMs = new Date(handoverAt).getTime();
  if (local.streamStoppedAt) {
    return new Date(local.streamStoppedAt).getTime() >= handoverMs - 120_000;
  }
  if (local.streamStartedAt) {
    return new Date(local.streamStartedAt).getTime() >= handoverMs - 120_000;
  }
  return false;
}

function overlayLocalRentalFields(
  remote: Rental,
  local: Rental | undefined,
): Rental {
  if (!local) return remote;

  const handoverAt = remote.ownerHandoverAt ?? local.ownerHandoverAt;
  const localStreamValid =
    Boolean(handoverAt) && localStreamBelongsToBooking(local, handoverAt!);

  const streamStarted = Boolean(
    remote.streamStartedAt ||
      (localStreamValid && (local.streamStartedAt || local.streamStoppedAt)),
  );

  if (!streamStarted && !handoverAt) return remote;

  return {
    ...remote,
    ownerHandoverAt: handoverAt,
    flowTxHash: remote.flowTxHash ?? (localStreamValid ? local.flowTxHash : undefined),
    streamStartedAt:
      remote.streamStartedAt ??
      (localStreamValid ? local.streamStartedAt : undefined),
    streamStoppedAt:
      remote.streamStoppedAt ??
      (localStreamValid ? local.streamStoppedAt : undefined),
    txHash: remote.txHash ?? (localStreamValid ? local.txHash : undefined),
    status:
      remote.status === "completed"
        ? "completed"
        : streamStarted
          ? "active"
          : remote.status,
    startDate: remote.streamStartedAt
      ? remote.startDate
      : localStreamValid && local.streamStartedAt
        ? (local.startDate ?? remote.startDate)
        : remote.startDate,
    endDate: remote.streamStartedAt
      ? remote.endDate
      : localStreamValid && local.streamStartedAt
        ? (local.endDate ?? remote.endDate)
        : remote.endDate,
  };
}
