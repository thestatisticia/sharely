import {
  pickValidStreamStartedAt,
  pickValidStreamStoppedAt,
  sanitizeRentalStreamFields,
} from "@/lib/rental-booking-stream";
import type { Rental } from "@/lib/types";

/** Merge browser-local rental patches into API results (server cannot read localStorage). */
export function mergeRentalsWithLocal(
  remote: Rental[],
  local: Rental[],
): Rental[] {
  const localById = new Map(local.map((r) => [r.id, r]));
  const remoteIds = new Set(remote.map((r) => r.id));

  const merged = remote.map((r) =>
    overlayLocalRentalFields(r, localById.get(r.id)),
  );
  const localOnly = local.filter((r) => !remoteIds.has(r.id));

  return [...merged, ...localOnly.map(sanitizeRentalStreamFields)];
}

function overlayLocalRentalFields(
  remote: Rental,
  local: Rental | undefined,
): Rental {
  const handoverAt = remote.ownerHandoverAt ?? local?.ownerHandoverAt;
  const streamStartedAt = pickValidStreamStartedAt(remote, local);
  const streamStoppedAt = pickValidStreamStoppedAt(
    streamStartedAt,
    remote,
    local,
  );

  if (!streamStartedAt && !streamStoppedAt && !handoverAt) {
    return sanitizeRentalStreamFields(remote);
  }

  const streamStarted = Boolean(streamStartedAt || streamStoppedAt);
  const localHasFreshStream =
    Boolean(local?.streamStartedAt) &&
    local!.streamStartedAt === streamStartedAt;

  return sanitizeRentalStreamFields({
    ...remote,
    ownerHandoverAt: handoverAt,
    streamStartedAt,
    streamStoppedAt,
    flowTxHash: streamStartedAt
      ? (remote.flowTxHash ?? (localHasFreshStream ? local!.flowTxHash : undefined))
      : undefined,
    txHash: streamStartedAt
      ? (remote.txHash ?? (localHasFreshStream ? local!.txHash : undefined))
      : undefined,
    status:
      remote.status === "completed"
        ? "completed"
        : streamStarted
          ? "active"
          : remote.status,
    startDate: streamStartedAt
      ? localHasFreshStream
        ? (local!.startDate ?? remote.startDate)
        : remote.startDate
      : remote.startDate,
    endDate: streamStartedAt
      ? localHasFreshStream
        ? (local!.endDate ?? remote.endDate)
        : remote.endDate
      : remote.endDate,
  });
}
