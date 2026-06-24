"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Shield,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useRentalOnChain } from "@/hooks/useRentalOnChain";
import {
  CFA_FORWARDER_ADDRESS,
  ESCROW_ADDRESS,
  G_DOLLAR_TOKEN_ADDRESS,
  cfaForwarderAbi,
  escrowAbi,
} from "@/lib/contracts";
import { formatG$, shortenAddress } from "@/lib/format";
import { dailyRateToFlowRate } from "@/lib/superfluid";
import { updateRental } from "@/lib/store";
import type { Rental } from "@/lib/types";

type Action = "confirm" | "stop" | "claim" | null;

export function RentalCard({
  rental,
  onUpdated,
}: {
  rental: Rental;
  onUpdated: () => void;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const chain = useRentalOnChain(rental);

  const [action, setAction] = useState<Action>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isOwner =
    address &&
    rental.ownerAddress.toLowerCase() === address.toLowerCase();
  const isRenter =
    address &&
    rental.renterAddress.toLowerCase() === address.toLowerCase();

  const dailyRate =
    rental.dailyRateG$ ??
    Math.round((rental.totalG$ - rental.depositG$) / Math.max(rental.days, 1));

  useEffect(() => {
    if (chain.isComplete && rental.status !== "completed") {
      updateRental(rental.id, { status: "completed" });
      onUpdated();
    }
  }, [chain.isComplete, rental.id, rental.status, onUpdated]);

  async function waitTx(hash: `0x${string}`) {
    if (!publicClient) throw new Error("No RPC client");
    await publicClient.waitForTransactionReceipt({ hash });
    setTxHash(hash);
  }

  async function handleConfirmReturn() {
    if (!rental.bookingId || !ESCROW_ADDRESS) return;
    setAction("confirm");
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: escrowAbi,
        functionName: "confirmReturn",
        args: [rental.bookingId],
      });
      await waitTx(hash);
      await chain.refetch();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm return failed");
    } finally {
      setAction(null);
    }
  }

  async function handleStopStream() {
    if (!address) return;
    setAction("stop");
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: CFA_FORWARDER_ADDRESS,
        abi: cfaForwarderAbi,
        functionName: "deleteFlow",
        args: [
          G_DOLLAR_TOKEN_ADDRESS,
          rental.renterAddress,
          rental.ownerAddress,
          "0x",
        ],
      });
      await waitTx(hash);
      await chain.refetch();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop stream failed");
    } finally {
      setAction(null);
    }
  }

  async function handleClaimDeposit() {
    if (!rental.bookingId || !ESCROW_ADDRESS) return;
    setAction("claim");
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: escrowAbi,
        functionName: "claimDeposit",
        args: [rental.bookingId],
      });
      await waitTx(hash);
      await chain.refetch();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim deposit failed");
    } finally {
      setAction(null);
    }
  }

  const busy = action !== null;
  const statusTone =
    rental.status === "completed" || chain.isComplete
      ? "success"
      : rental.status === "active"
        ? "warning"
        : "muted";

  const statusLabel =
    chain.isComplete || rental.status === "completed"
      ? "completed"
      : chain.streamActive
        ? "streaming"
        : rental.status;

  return (
    <div className="surface space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{rental.listingTitle}</p>
          <p className="mt-1 text-sm text-muted">
            {rental.days} days · {formatG$(dailyRate)} G$/day ·{" "}
            {formatG$(rental.depositG$)} G$ deposit
          </p>
          <p className="mt-1 text-xs text-muted">
            {isRenter ? "You rented" : isOwner ? "Your listing" : "Rental"} ·
            Renter {shortenAddress(rental.renterAddress, 3)} · Owner{" "}
            {shortenAddress(rental.ownerAddress, 3)}
          </p>
        </div>
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </div>

      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-2xl bg-surface-hover px-3 py-2">
          <Waves className="h-4 w-4 text-primary" />
          <span>
            Stream:{" "}
            {chain.flowLoading
              ? "…"
              : chain.streamActive
                ? "active"
                : "stopped"}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-surface-hover px-3 py-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>
            Deposit:{" "}
            {chain.depositLoading
              ? "…"
              : chain.depositReleased
                ? "returned"
                : "locked"}
          </span>
        </div>
      </div>

      {!chain.hasEscrow ? (
        <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Escrow not configured or missing booking ID — on-chain actions unavailable.
        </p>
      ) : null}

      {isOwner && !chain.depositReleased && chain.hasEscrow ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Item returned? Confirm to release the renter&apos;s deposit.
          </p>
          <Button
            fullWidth
            onClick={() => void handleConfirmReturn()}
            disabled={busy}
          >
            {action === "confirm" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <CheckCircle2 className="h-4 w-4" />
            Confirm return & release deposit
          </Button>
        </div>
      ) : null}

      {isRenter ? (
        <div className="space-y-2">
          {chain.streamActive ? (
            <>
              <p className="text-sm text-muted">
                End the rental period? Stop the G$ stream so you stop paying the
                daily rate.
              </p>
              <Button
                fullWidth
                variant="secondary"
                onClick={() => void handleStopStream()}
                disabled={busy}
              >
                {action === "stop" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Stop rental stream
              </Button>
            </>
          ) : null}

          {!chain.depositReleased && chain.hasEscrow ? (
            chain.canClaimDeposit ? (
              <Button
                fullWidth
                onClick={() => void handleClaimDeposit()}
                disabled={busy}
              >
                {action === "claim" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Claim deposit (owner did not confirm)
              </Button>
            ) : chain.claimableAfterDate ? (
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Clock className="h-3.5 w-3.5" />
                Can claim deposit after{" "}
                {chain.claimableAfterDate.toLocaleString()} if owner doesn&apos;t
                confirm
              </p>
            ) : null
          ) : chain.depositReleased ? (
            <p className="text-sm text-emerald-800">Deposit returned to you.</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 text-xs">
        {rental.escrowTxHash ? (
          <a
            href={`https://celoscan.io/tx/${rental.escrowTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary"
          >
            Escrow tx
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        {rental.flowTxHash ? (
          <a
            href={`https://celoscan.io/tx/${rental.flowTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary"
          >
            Stream tx
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        {txHash ? (
          <a
            href={`https://celoscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary"
          >
            Latest tx
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
