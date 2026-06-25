"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { Loader2, Shield, Waves } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { VerificationGate } from "@/components/wallet/Verification";
import { useGBalance, useVerificationState } from "@/hooks/useGoodDollar";
import { createBookingId } from "@/lib/booking";
import {
  ESCROW_ADDRESS,
  G_DOLLAR_TOKEN_ADDRESS,
  erc20Abi,
  escrowAbi,
} from "@/lib/contracts";
import { formatG$, parseG$ } from "@/lib/format";
import { createRental } from "@/lib/rentals-api";
import { createId } from "@/lib/store";
import { flowRateLabel } from "@/lib/superfluid";
import type { Listing } from "@/lib/types";

type RentStep =
  | "idle"
  | "approving"
  | "locking"
  | "done"
  | "error";

export function RentPanel({ listing }: { listing: Listing }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const verification = useVerificationState();
  const { balance, refetch: refetchBalance } = useGBalance();
  const [days, setDays] = useState(2);
  const [step, setStep] = useState<RentStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<string[]>([]);

  const { writeContractAsync } = useWriteContract();

  const rentalTotal = listing.dailyRateG$ * days;
  const depositWei = parseG$(listing.depositG$);
  const hasEscrow = Boolean(ESCROW_ADDRESS);

  const { data: allowance } = useReadContract({
    address: G_DOLLAR_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && ESCROW_ADDRESS
        ? [address, ESCROW_ADDRESS as `0x${string}`]
        : undefined,
    query: { enabled: Boolean(address && ESCROW_ADDRESS) },
  });

  /** Deposit only at booking — stream starts after pickup confirmation. */
  const requiredG$ = depositWei;

  const isOwnListing =
    address &&
    listing.ownerAddress.toLowerCase() === address.toLowerCase();

  const isDemoOwner = listing.ownerAddress.startsWith(
    "0x000000000000000000000000000000000000",
  );

  const wait = useCallback(
    async (hash: `0x${string}`) => {
      if (!publicClient) throw new Error("No RPC client");
      await publicClient.waitForTransactionReceipt({ hash });
      setTxHashes((prev) => [...prev, hash]);
    },
    [publicClient],
  );

  const handleRent = async () => {
    setError(null);

    if (!address || !publicClient) {
      setError("Connect your wallet on Celo.");
      return;
    }

    if (!listing.available) {
      setError("This item is currently rented.");
      return;
    }

    if (!verification.canParticipate) {
      setError("Verify your GoodDollar identity first.");
      return;
    }

    if (isOwnListing) {
      setError("You cannot rent your own listing.");
      return;
    }

    if (isDemoOwner) {
      setError(
        "Demo listings cannot receive payments. List your own item to test the full flow.",
      );
      return;
    }

    if (!hasEscrow) {
      setError(
        "Escrow contract not configured. Set NEXT_PUBLIC_ESCROW_ADDRESS after deploying contracts/ShareGEscrow.sol.",
      );
      return;
    }

    if (balance === undefined) {
      setError("Could not read your G$ balance. Try again.");
      return;
    }

    if (balance < requiredG$) {
      setError(
        `Insufficient G$. You need ${formatG$(depositWei)} G$ for the security deposit. Balance: ${formatG$(balance)} G$.`,
      );
      return;
    }

    const bookingId = createBookingId(listing.id, address, listing.ownerAddress);

    try {
      if (!allowance || allowance < depositWei) {
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: G_DOLLAR_TOKEN_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [ESCROW_ADDRESS as `0x${string}`, depositWei],
        });
        await wait(approveHash);
      }

      setStep("locking");
      const lockHash = await writeContractAsync({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: escrowAbi,
        functionName: "lockDeposit",
        args: [
          bookingId,
          listing.ownerAddress,
          depositWei,
          BigInt(days),
        ],
      });
      await wait(lockHash);

      const bookedAt = new Date();
      const estimatedEnd = new Date(bookedAt);
      estimatedEnd.setDate(estimatedEnd.getDate() + days);

      await createRental({
        id: createId("rental"),
        listingId: listing.id,
        listingTitle: listing.title,
        renterAddress: address,
        ownerAddress: listing.ownerAddress,
        days,
        dailyRateG$: listing.dailyRateG$,
        totalG$: rentalTotal + listing.depositG$,
        depositG$: listing.depositG$,
        status: "pending",
        bookingId,
        escrowTxHash: lockHash,
        createdAt: bookedAt.toISOString(),
        // Booked-at / estimated return — real stream dates set at pickup
        startDate: bookedAt.toISOString(),
        endDate: estimatedEnd.toISOString(),
      });

      await refetchBalance();
      setStep("done");
    } catch (err) {
      setStep("error");
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  if (step === "done") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-bold text-emerald-900">Booking confirmed!</p>
        <p className="mt-1 text-sm text-emerald-800">
          Your security deposit is locked in escrow — no payment stream yet. Meet
          the owner for pickup. After they tap <strong>I&apos;ve delivered the
          item</strong>, go to <strong>My rentals</strong> and tap{" "}
          <strong>I received the item — start rental</strong> to begin G$
          payments.
        </p>
        {txHashes.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-emerald-900">
            {txHashes.map((hash) => (
              <li key={hash}>
                <a
                  className="underline"
                  href={`https://celoscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {hash.slice(0, 10)}…
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href="/rentals" className="mt-4 block">
          <Button fullWidth variant="secondary">
            Manage rental
          </Button>
        </Link>
      </div>
    );
  }

  const busy = step !== "idle" && step !== "error";

  return (
    <VerificationGate action="request this rental">
      <div className="surface-elevated space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <p className="eyebrow">Rate</p>
          <p className="text-2xl font-bold text-foreground">
            {formatG$(listing.dailyRateG$)} G$/day
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Rental period</p>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={14}
              value={days}
              disabled={busy}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-2 w-full accent-primary"
            />
            <span className="w-20 text-right text-sm font-bold">{days} days</span>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/60 bg-surface-hover p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Total rental</span>
            <span className="text-lg font-bold text-foreground">
              {formatG$(rentalTotal)} G$
            </span>
          </div>
          <div className="flex items-start justify-between gap-2 border-t border-border/50 pt-3">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Shield className="h-4 w-4 text-primary" />
              Security deposit
            </span>
            <span className="text-right font-semibold">
              {formatG$(listing.depositG$)} G$
              <span className="block text-xs font-medium text-muted">
                Held in escrow · refunded on return
              </span>
            </span>
          </div>
          <div className="flex items-start justify-between gap-2 border-t border-border/50 pt-3">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Waves className="h-4 w-4 text-primary" />
              Payment stream
            </span>
            <span className="text-right font-semibold">
              {flowRateLabel(listing.dailyRateG$)}
              <span className="block text-xs font-medium text-muted">
                Starts after you confirm pickup
              </span>
            </span>
          </div>
        </div>

        {address && balance !== undefined ? (
          <p className="text-xs text-muted">
            Your balance: {formatG$(balance)} G$ · Need {formatG$(depositWei)} G$
            deposit now (rental stream starts at pickup)
          </p>
        ) : null}

        <ol className="space-y-2 text-xs text-muted">
          <li className={step === "approving" ? "font-semibold text-primary" : ""}>
            1. Approve G$ for escrow
          </li>
          <li className={step === "locking" ? "font-semibold text-primary" : ""}>
            2. Lock security deposit
          </li>
          <li>3. Owner confirms delivery → you start stream in My rentals</li>
        </ol>

        {!hasEscrow ? (
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Deploy <code className="font-mono">ShareGEscrow.sol</code> and set{" "}
            <code className="font-mono">NEXT_PUBLIC_ESCROW_ADDRESS</code> in{" "}
            <code className="font-mono">.env.local</code>.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Button fullWidth size="lg" onClick={handleRent} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy
            ? step === "approving"
              ? "Approving G$…"
              : "Locking deposit…"
            : "Request rental"}
        </Button>
      </div>
    </VerificationGate>
  );
}
