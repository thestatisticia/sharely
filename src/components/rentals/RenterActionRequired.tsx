"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Package } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useStartRentalStream } from "@/hooks/useStartRentalStream";
import { useSyncRentalStreamFromChain } from "@/hooks/useSyncRentalStreamFromChain";
import { formatG$ } from "@/lib/format";
import { isStreamConfirmingOnChain, streamStartedForCurrentBooking } from "@/lib/rental-booking-stream";
import type { Rental } from "@/lib/types";

export function RenterActionRequired({
  rental,
  onUpdated,
}: {
  rental: Rental;
  onUpdated: () => void | Promise<void>;
}) {
  const chain = useSyncRentalStreamFromChain(rental, () => {
    void onUpdated();
  });
  const { startStream, formatError: formatStreamError } = useStartRentalStream(rental);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamLive =
    chain.streamActive ||
    isStreamConfirmingOnChain(rental, chain, chain.nowMs) ||
    streamStartedForCurrentBooking(rental);

  async function handleStartStream() {
    if (!chain.hasEscrow) return;
    setBusy(true);
    setError(null);
    try {
      await startStream();
      await chain.refetch();
      await onUpdated();
    } catch (err) {
      setError(formatStreamError(err));
    } finally {
      setBusy(false);
    }
  }

  if (streamLive) return null;

  return (
    <div
      id={`rental-action-${rental.id}`}
      className="surface-elevated space-y-4 border-2 border-red-300 bg-red-50/90 p-5 dark:border-red-800 dark:bg-red-950/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
            Action required
          </p>
          <p className="mt-1 text-lg font-bold text-red-950 dark:text-red-50">
            Start your rental for {rental.listingTitle}
          </p>
          <p className="mt-2 text-sm text-red-900 dark:text-red-100">
            The owner confirmed delivery. You must start the G$ payment stream now
            — your {formatG$(rental.depositG$)} G$ deposit stays locked until the
            rental ends.
          </p>
          <p className="mt-2 text-xs text-red-800 dark:text-red-200">
            MetaMask will prompt twice: a free signature, then a transaction that
            uses CELO for gas. Keep enough G$ in your wallet for rental payments
            (separate from the escrow deposit).
          </p>
        </div>
      </div>

      <Button
        fullWidth
        size="lg"
        onClick={() => void handleStartStream()}
        disabled={busy || !chain.hasEscrow}
        className="bg-red-600 hover:bg-red-700"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        <Package className="h-5 w-5" />
        {busy ? "Confirm in MetaMask…" : "I received the item — start rental"}
      </Button>

      {error ? (
        <p className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
