"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useSignMessage, useWriteContract } from "wagmi";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Package,
  Shield,
  TrendingUp,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useRentalOnChain } from "@/hooks/useRentalOnChain";
import { useStartRentalStream } from "@/hooks/useStartRentalStream";
import {
  CFA_FORWARDER_ADDRESS,
  ESCROW_ADDRESS,
  G_DOLLAR_TOKEN_ADDRESS,
  cfaForwarderAbi,
  escrowAbi,
} from "@/lib/contracts";
import { formatG$, shortenAddress } from "@/lib/format";
import { patchRental } from "@/lib/rentals-api";
import { getRentalProgress } from "@/lib/rental-progress";
import { buildHandoverSignMessage } from "@/lib/rental-sign";
import { canRenterCancelBeforePickup } from "@/lib/renter-action";
import type { Rental } from "@/lib/types";

type Action = "confirm" | "stop" | "claim" | "start" | "handover" | "cancel" | null;

function StreamProgress({
  progress,
  earnedG$,
  totalRentalG$,
}: {
  progress: number;
  earnedG$: number;
  totalRentalG$: number;
}) {
  const pct = Math.round(progress * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-muted">Rental stream progress</span>
        <span className="text-foreground">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted">
        ~{formatG$(earnedG$)} G$ earned of {formatG$(totalRentalG$)} G$ rental
        total
      </p>
    </div>
  );
}

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
  const { signMessageAsync } = useSignMessage();
  const chain = useRentalOnChain(rental);
  const { startStream } = useStartRentalStream(rental);

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

  const progress = useMemo(
    () =>
      getRentalProgress(rental, chain.streamActive, chain.depositReleased),
    [rental, chain.streamActive, chain.depositReleased],
  );

  const awaitingStreamStart =
    Boolean(rental.bookingId) &&
    !chain.hasRecordedStreamStart &&
    !chain.streamActive &&
    !chain.depositReleased;

  const canCancelBeforePickup = canRenterCancelBeforePickup(rental, address);
  const strayOnChainFlow =
    chain.onChainFlowActive &&
    !chain.streamActive &&
    Boolean(rental.ownerHandoverAt);

  const canRenterStartStream =
    awaitingStreamStart && Boolean(rental.ownerHandoverAt);

  useEffect(() => {
    if (chain.isComplete && rental.status !== "completed") {
      void patchRental(
        rental.id,
        { status: "completed" },
        { listingId: rental.listingId, relistOnComplete: true, ownerAddress: rental.ownerAddress },
      ).then(onUpdated);
    } else if (
      chain.streamActive &&
      rental.status === "pending" &&
      rental.flowTxHash
    ) {
      void patchRental(rental.id, { status: "active" }).then(onUpdated);
    }
  }, [
    chain.isComplete,
    chain.streamActive,
    rental.id,
    rental.listingId,
    rental.status,
    onUpdated,
  ]);

  async function handleConfirmHandover() {
    if (!address) return;
    setAction("handover");
    setError(null);
    try {
      const now = new Date().toISOString();
      await signMessageAsync({
        message: buildHandoverSignMessage(rental, now),
      });
      await patchRental(rental.id, { ownerHandoverAt: now });
      onUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not record handover";
      if (message.toLowerCase().includes("reject")) {
        setError("Signature cancelled. Approve in MetaMask to confirm delivery.");
      } else {
        setError(message);
      }
    } finally {
      setAction(null);
    }
  }

  async function waitTx(hash: `0x${string}`) {
    if (!publicClient) throw new Error("No RPC client");
    await publicClient.waitForTransactionReceipt({ hash });
    setTxHash(hash);
  }

  async function handleStartStream() {
    if (!address) return;
    setAction("start");
    setError(null);
    try {
      await startStream();
      await chain.refetch();
      await onUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start stream";
      if (message.toLowerCase().includes("reject")) {
        setError(
          "Cancelled in MetaMask. Step 1 is a free signature; step 2 is the stream transaction (uses CELO for gas).",
        );
      } else {
        setError(message);
      }
    } finally {
      setAction(null);
    }
  }

  async function handleCancelBooking() {
    if (!address || !canCancelBeforePickup) return;
    setAction("cancel");
    setError(null);
    try {
      await patchRental(
        rental.id,
        { status: "completed" },
        {
          listingId: rental.listingId,
          relistOnComplete: true,
          ownerAddress: rental.ownerAddress,
        },
      );
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel booking");
    } finally {
      setAction(null);
    }
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
      : progress.phase === "streaming"
        ? "warning"
        : progress.phase === "pending"
          ? "muted"
          : rental.status === "active"
            ? "warning"
            : "muted";

  const statusLabel =
    chain.isComplete || rental.status === "completed"
      ? "completed"
      : progress.phase === "pending"
        ? rental.ownerHandoverAt
          ? "ready to start"
          : "awaiting pickup"
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

      {progress.phase === "streaming" ? (
        <StreamProgress
          progress={progress.progress}
          earnedG$={progress.earnedG$}
          totalRentalG$={progress.totalRentalG$}
        />
      ) : null}

      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-2xl bg-surface-hover px-3 py-2">
          <Waves className="h-4 w-4 text-primary" />
          <span>
            Stream:{" "}
            {chain.flowLoading
              ? "…"
              : chain.streamActive
                ? "active"
                : awaitingStreamStart
                  ? "not started"
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

      {isOwner && chain.streamActive ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-900">
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <TrendingUp className="h-4 w-4" />
            Earnings stream live
          </p>
          <p className="mt-1 text-xs">
            Rental G$ flows straight to your wallet in real time — no claim
            button needed. Check your G$ balance on Profile.
          </p>
        </div>
      ) : null}

      {isOwner && awaitingStreamStart && !chain.streamActive ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-900">
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <Package className="h-4 w-4" />
            New booking — deposit locked
          </p>
          <p className="mt-1 text-xs">
            Hand over the item, then sign in MetaMask to confirm delivery. The
            renter must then start the G$ stream from their wallet.
          </p>
          {!rental.ownerHandoverAt ? (
            <Button
              fullWidth
              className="mt-3"
              size="sm"
              onClick={() => void handleConfirmHandover()}
              disabled={busy}
            >
              {action === "handover" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirm in MetaMask…
                </>
              ) : (
                "I've delivered the item"
              )}
            </Button>
          ) : (
            <p className="mt-2 text-xs font-medium">
              Handover recorded — waiting for renter to start payments.
            </p>
          )}
        </div>
      ) : null}

      {isRenter && awaitingStreamStart && !rental.ownerHandoverAt ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-900">
          <p className="font-semibold">Waiting for owner delivery</p>
          <p className="mt-1 text-xs">
            Your deposit is locked. The owner must confirm they handed over the
            item before you can start the payment stream.
          </p>
          {canCancelBeforePickup ? (
            <Button
              fullWidth
              variant="secondary"
              className="mt-3"
              size="sm"
              onClick={() => void handleCancelBooking()}
              disabled={busy}
            >
              {action === "cancel" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Cancel booking
            </Button>
          ) : null}
          {canCancelBeforePickup ? (
            <p className="mt-2 text-xs">
              Cancelling re-lists the item. Your deposit stays in escrow until the
              claim date below if the owner never delivers.
            </p>
          ) : null}
        </div>
      ) : null}

      {isRenter && strayOnChainFlow ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-900">
          <p className="font-semibold">Stream not linked to this booking</p>
          <p className="mt-1 text-xs">
            A G$ stream exists between you and this owner on-chain, but it does
            not match this rental. Finish starting the rental below, or check for
            an older stream in your wallet history.
          </p>
        </div>
      ) : null}

      {isRenter && canRenterStartStream ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
          <p className="font-semibold">Owner confirmed delivery</p>
          <p className="mt-1 text-xs">
            Start the rental stream now. Your deposit stays locked until the
            rental ends — payments stream to the owner in real time.
          </p>
        </div>
      ) : null}

      {!chain.hasEscrow ? (
        <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Escrow not configured or missing booking ID — on-chain actions unavailable.
        </p>
      ) : null}

      {isRenter && canRenterStartStream && chain.hasEscrow ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Received the item? MetaMask will ask twice: first a free signature,
            then a transaction that uses a small amount of CELO for gas.
          </p>
          <Button
            fullWidth
            onClick={() => void handleStartStream()}
            disabled={busy}
          >
            {action === "start" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirm in MetaMask…
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                I received the item — start rental
              </>
            )}
          </Button>
        </div>
      ) : null}

      {isOwner && !chain.depositReleased && chain.hasEscrow && !awaitingStreamStart ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Item returned? Confirm to release the renter&apos;s security deposit.
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
          {chain.streamActive && !chain.depositReleased ? (
            <p className="text-sm text-muted">
              Payments stream to the owner while you use the item. Return it when
              finished — the owner confirms return to release your deposit.
            </p>
          ) : null}

          {chain.streamActive && chain.depositReleased ? (
            <>
              <p className="text-sm text-muted">
                Return confirmed and deposit released. Stop the payment stream to
                end daily charges.
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
                Stop payment stream
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
