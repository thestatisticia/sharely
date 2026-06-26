"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
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
import { useAutoStopRentalStream } from "@/hooks/useAutoStopRentalStream";
import { useSyncRentalStreamFromChain } from "@/hooks/useSyncRentalStreamFromChain";
import { useStartRentalStream } from "@/hooks/useStartRentalStream";
import { useWalletSession } from "@/hooks/useWalletSession";
import {
  CELO_CHAIN_ID,
  ESCROW_ADDRESS,
  escrowAbi,
} from "@/lib/contracts";
import { formatG$, shortenAddress } from "@/lib/format";
import { buildOwnerHandoverPatch } from "@/lib/handover-patch";
import { patchRental } from "@/lib/rentals-api";
import { getRentalProgress } from "@/lib/rental-progress";
import { canRenterCancelBeforePickup, getOwnerRentalPhase, getRenterRentalPhase } from "@/lib/renter-action";
import {
  isStreamConfirmingOnChain,
  streamStartedForCurrentBooking,
  streamStoppedForCurrentBooking,
} from "@/lib/rental-booking-stream";
import type { Rental } from "@/lib/types";
import {
  formatWalletTxError,
  waitForSuccessfulTx,
  writeContractFresh,
} from "@/lib/wallet-tx";

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
  const publicClient = usePublicClient({ chainId: CELO_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const { ensureSession } = useWalletSession();
  const chain = useSyncRentalStreamFromChain(rental, onUpdated);
  const { startStream, formatError: formatStreamError } = useStartRentalStream(rental);
  const autoStop = useAutoStopRentalStream(rental, {
    streamActive: chain.streamActive,
    flowRate: chain.flowRate,
    flowLastUpdated: chain.flowLastUpdated,
    onRefetch: chain.refetch,
    onUpdated,
  });

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

  const renterPhase = isRenter
    ? getRenterRentalPhase(rental, chain)
    : null;
  const ownerPhase = isOwner ? getOwnerRentalPhase(rental, chain) : null;

  const awaitingStreamStart =
    Boolean(rental.bookingId) &&
    !chain.streamActive &&
    !chain.depositReleased &&
    !streamStoppedForCurrentBooking(rental) &&
    (renterPhase === "awaiting_pickup" ||
      renterPhase === "ready_to_start" ||
      ownerPhase === "awaiting_handover" ||
      ownerPhase === "awaiting_renter_stream");

  const canCancelBeforePickup = canRenterCancelBeforePickup(rental, address);

  const canRenterStartStream = renterPhase === "ready_to_start";
  const streamConfirming =
    isStreamConfirmingOnChain(rental, chain, chain.nowMs) &&
    renterPhase === "streaming";

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
      streamStartedForCurrentBooking(rental)
    ) {
      void patchRental(rental.id, { status: "active" }).then(onUpdated);
    }
  }, [
    chain.isComplete,
    chain.streamActive,
    rental.id,
    rental.listingId,
    rental.status,
    rental.streamStartedAt,
    rental.ownerHandoverAt,
    onUpdated,
  ]);

  async function handleConfirmHandover() {
    if (!address) return;
    setAction("handover");
    setError(null);
    try {
      await ensureSession();
      const now = new Date().toISOString();
      await patchRental(rental.id, buildOwnerHandoverPatch(now));
      onUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not record handover";
      if (message.toLowerCase().includes("reject")) {
        setError("Sign-in cancelled. Complete wallet sign-in to confirm delivery.");
      } else {
        setError(message);
      }
    } finally {
      setAction(null);
    }
  }

  async function waitTx(hash: `0x${string}`) {
    if (!publicClient) throw new Error("No RPC client");
    await waitForSuccessfulTx(publicClient, hash);
    setTxHash(hash);
  }

  async function writeEscrow(
    functionName: "confirmReturn" | "claimDeposit",
  ) {
    if (!address || !publicClient || !rental.bookingId || !ESCROW_ADDRESS) {
      throw new Error("Wallet or booking not ready.");
    }
    const hash = await writeContractFresh(
      publicClient,
      writeContractAsync,
      address,
      {
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: escrowAbi,
        functionName,
        args: [rental.bookingId],
      },
    );
    await waitTx(hash);
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
      setError(formatStreamError(err));
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
      await writeEscrow("confirmReturn");
      await chain.refetch();
      onUpdated();
    } catch (err) {
      setError(formatWalletTxError(err));
    } finally {
      setAction(null);
    }
  }

  async function handleStopStream() {
    if (!address) return;
    setAction("stop");
    setError(null);
    try {
      const ok = await autoStop.stopStream();
      if (!ok) throw new Error("Stop stream failed");
      setTxHash(null);
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
      await writeEscrow("claimDeposit");
      await chain.refetch();
      onUpdated();
    } catch (err) {
      setError(formatWalletTxError(err));
    } finally {
      setAction(null);
    }
  }

  const busy = action !== null || autoStop.stopping;
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
      ? renterPhase === "cancelled"
        ? "cancelled"
        : "completed"
      : renterPhase === "awaiting_pickup"
        ? "awaiting pickup"
        : renterPhase === "ready_to_start"
          ? "ready to start"
          : renterPhase === "payments_ended"
            ? "payments ended"
            : renterPhase === "streaming"
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

      {isOwner && ownerPhase === "awaiting_handover" ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-900">
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <Package className="h-4 w-4" />
            New booking — confirm delivery
          </p>
          <p className="mt-1 text-xs">
            The renter&apos;s deposit is locked in escrow. Hand over the item,
            then sign in MetaMask to confirm delivery. They start the G$ payment
            stream after that.
          </p>
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
        </div>
      ) : null}

      {isOwner && ownerPhase === "awaiting_renter_stream" ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-900">
          <p className="font-semibold">Delivery confirmed</p>
          <p className="mt-1 text-xs">
            Waiting for the renter to start the G$ payment stream from their
            wallet.
          </p>
        </div>
      ) : null}

      {isRenter && renterPhase === "awaiting_pickup" ? (
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

      {isRenter && renterPhase === "cancelled" ? (
        <div className="rounded-2xl border border-border/80 bg-surface-hover px-3 py-2.5 text-sm text-foreground">
          <p className="font-semibold">Booking cancelled</p>
          <p className="mt-1 text-xs text-muted">
            This booking was cancelled before pickup. The item is listed again.
            Your deposit stays in escrow until the claim date below unless the
            owner confirms a return.
          </p>
        </div>
      ) : null}

      {isRenter && streamConfirming ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting payment stream…
          </p>
          <p className="mt-1 text-xs text-muted">
            Waiting for Celo to confirm your stream. This usually takes a few
            seconds — G$ flows continuously at {formatG$(dailyRate)}/day until
            the rental total is paid.
          </p>
        </div>
      ) : null}

      {isRenter && renterPhase === "payments_ended" ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-900">
          <p className="font-semibold">Payment stream ended</p>
          <p className="mt-1 text-xs">
            Rental payments have stopped. Return the item to the owner and ask
            them to confirm return in the app to release your{" "}
            {formatG$(rental.depositG$)} G$ deposit.
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

      {isOwner && ownerPhase === "awaiting_return" && chain.hasEscrow ? (
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
              Payments stream to the owner until the full rental total (
              {formatG$(dailyRate * rental.days)} G$) is reached — then the
              stream stops automatically. Return the item and ask the owner to
              confirm return for your deposit.
            </p>
          ) : null}

          {autoStop.paymentCapReached && chain.streamActive ? (
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-900">
              <p className="font-semibold">Rental payments complete</p>
              <p className="mt-1 text-xs">
                {autoStop.stopping
                  ? "Confirm in MetaMask to stop the stream…"
                  : "Full rental total reached. Approve the transaction to stop the stream."}
              </p>
              {!autoStop.stopping ? (
                <Button
                  fullWidth
                  variant="secondary"
                  className="mt-3"
                  size="sm"
                  onClick={() => void handleStopStream()}
                  disabled={busy}
                >
                  Stop payment stream
                </Button>
              ) : null}
            </div>
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
