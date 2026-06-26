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

function overlayLocalRentalFields(
  remote: Rental,
  local: Rental | undefined,
): Rental {
  if (!local) return remote;

  const streamStarted = Boolean(local.flowTxHash || local.streamStartedAt);
  const handoverAt = remote.ownerHandoverAt ?? local.ownerHandoverAt;

  if (!streamStarted && !handoverAt) return remote;

  return {
    ...remote,
    ownerHandoverAt: handoverAt,
    flowTxHash: remote.flowTxHash ?? local.flowTxHash,
    streamStartedAt: remote.streamStartedAt ?? local.streamStartedAt,
    txHash: remote.txHash ?? local.txHash,
    status:
      remote.status === "completed"
        ? "completed"
        : streamStarted
          ? "active"
          : remote.status,
    startDate: local.streamStartedAt
      ? (local.startDate ?? remote.startDate)
      : remote.startDate,
    endDate: local.streamStartedAt
      ? (local.endDate ?? remote.endDate)
      : remote.endDate,
  };
}
