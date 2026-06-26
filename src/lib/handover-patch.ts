/** Reset stream fields when owner confirms delivery so this booking starts clean. */
export function buildOwnerHandoverPatch(ownerHandoverAt: string) {
  return {
    ownerHandoverAt,
    streamStartedAt: null,
    streamStoppedAt: null,
    flowTxHash: null,
    txHash: null,
  } as const;
}
