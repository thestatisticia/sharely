"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useSignMessage, useWriteContract } from "wagmi";
import { AlertTriangle, Loader2, Package } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useRentalOnChain } from "@/hooks/useRentalOnChain";
import {
  CFA_FORWARDER_ADDRESS,
  G_DOLLAR_TOKEN_ADDRESS,
  cfaForwarderAbi,
} from "@/lib/contracts";
import { formatG$ } from "@/lib/format";
import { patchRental } from "@/lib/rentals-api";
import { buildStreamStartSignMessage } from "@/lib/rental-sign";
import { dailyRateToFlowRate } from "@/lib/superfluid";
import type { Rental } from "@/lib/types";

export function RenterActionRequired({
  rental,
  onUpdated,
}: {
  rental: Rental;
  onUpdated: () => void;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const chain = useRentalOnChain(rental);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dailyRate =
    rental.dailyRateG$ ??
    Math.round((rental.totalG$ - rental.depositG$) / Math.max(rental.days, 1));

  async function handleStartStream() {
    if (!address || !chain.hasEscrow) return;
    setBusy(true);
    setError(null);
    try {
      const attestAt = new Date().toISOString();
      await signMessageAsync({
        message: buildStreamStartSignMessage(rental, attestAt),
      });

      const flowRate = dailyRateToFlowRate(dailyRate);
      const hash = await writeContractAsync({
        address: CFA_FORWARDER_ADDRESS,
        abi: cfaForwarderAbi,
        functionName: "createFlow",
        args: [
          G_DOLLAR_TOKEN_ADDRESS,
          address,
          rental.ownerAddress,
          flowRate,
          "0x",
        ],
      });
      if (!publicClient) throw new Error("No RPC client");
      await publicClient.waitForTransactionReceipt({ hash });

      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + rental.days);

      await patchRental(rental.id, {
        status: "active",
        flowTxHash: hash,
        txHash: hash,
        streamStartedAt: now.toISOString(),
        startDate: now.toISOString(),
        endDate: end.toISOString(),
      });
      await chain.refetch();
      onUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start stream";
      if (message.toLowerCase().includes("reject")) {
        setError("Cancelled in MetaMask. Approve the signature, then the stream transaction.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (chain.streamActive || rental.flowTxHash) return null;

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
