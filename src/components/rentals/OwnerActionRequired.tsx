"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { AlertTriangle, Loader2, Package } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useWalletSession } from "@/hooks/useWalletSession";
import { buildOwnerHandoverPatch } from "@/lib/handover-patch";
import { formatG$, shortenAddress } from "@/lib/format";
import { patchRental } from "@/lib/rentals-api";
import { needsOwnerHandover } from "@/lib/renter-action";
import type { Rental } from "@/lib/types";

export function OwnerActionRequired({
  rental,
  onUpdated,
}: {
  rental: Rental;
  onUpdated: () => void | Promise<void>;
}) {
  const { address } = useAccount();
  const { ensureSession } = useWalletSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!address || !needsOwnerHandover(rental, address)) return null;

  async function handleConfirmHandover() {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      const now = new Date().toISOString();
      await patchRental(rental.id, buildOwnerHandoverPatch(now));
      await onUpdated();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not record handover";
      if (message.toLowerCase().includes("reject")) {
        setError("Sign-in cancelled. Complete wallet sign-in to confirm delivery.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      id={`owner-action-${rental.id}`}
      className="surface-elevated space-y-4 border-2 border-amber-300 bg-amber-50/90 p-5 dark:border-amber-800 dark:bg-amber-950/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            New booking
          </p>
          <p className="mt-1 text-lg font-bold text-amber-950 dark:text-amber-50">
            {rental.listingTitle} — someone booked your item
          </p>
          <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">
            Renter {shortenAddress(rental.renterAddress, 4)} locked{" "}
            {formatG$(rental.depositG$)} G$ in escrow. Hand over the item, then
            confirm delivery so they can start payments.
          </p>
        </div>
      </div>

      <Button
        fullWidth
        size="lg"
        onClick={() => void handleConfirmHandover()}
        disabled={busy}
        className="bg-amber-600 hover:bg-amber-700"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        <Package className="h-5 w-5" />
        {busy ? "Confirming…" : "I've delivered the item"}
      </Button>

      {error ? (
        <p className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
