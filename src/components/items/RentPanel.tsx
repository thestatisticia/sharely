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
  CFA_FORWARDER_ADDRESS,
  ESCROW_ADDRESS,
  G_DOLLAR_TOKEN_ADDRESS,
  cfaForwarderAbi,
  erc20Abi,
  escrowAbi,
} from "@/lib/contracts";
import { formatG$, parseG$ } from "@/lib/format";
import { createId, saveRental } from "@/lib/store";
import { dailyRateToFlowRate, flowRateLabel } from "@/lib/superfluid";
import type { Listing } from "@/lib/types";

type RentStep =
  | "idle"
  | "approving"
  | "locking"
  | "streaming"
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
  const flowRate = dailyRateToFlowRate(listing.dailyRateG$);
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

  const { data: bufferData } = useReadContract({
    address: CFA_FORWARDER_ADDRESS,
    abi: cfaForwarderAbi,
    functionName: "getBufferAmountByFlowrate",
    args: [G_DOLLAR_TOKEN_ADDRESS, flowRate],
    query: { enabled: hasEscrow && flowRate > BigInt(0) },
  });

  const streamBuffer =
    (bufferData as readonly [bigint, bigint] | undefined)?.[0] ?? BigInt(0);
  const requiredG$ = depositWei + parseG$(rentalTotal) + streamBuffer;

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
        `Insufficient G$. You need about ${formatG$(requiredG$)} G$ (deposit + ${days}d rental + stream buffer). Balance: ${formatG$(balance)} G$.`,
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

      setStep("streaming");
      const flowHash = await writeContractAsync({
        address: CFA_FORWARDER_ADDRESS,
        abi: cfaForwarderAbi,
        functionName: "createFlow",
        args: [
          G_DOLLAR_TOKEN_ADDRESS,
          address,
          listing.ownerAddress,
          flowRate,
          "0x",
        ],
      });
      await wait(flowHash);

      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + days);

      saveRental({
        id: createId("rental"),
        listingId: listing.id,
        listingTitle: listing.title,
        renterAddress: address,
        ownerAddress: listing.ownerAddress,
        days,
        dailyRateG$: listing.dailyRateG$,
        totalG$: rentalTotal + listing.depositG$,
        depositG$: listing.depositG$,
        status: "active",
        bookingId,
        escrowTxHash: lockHash,
        flowTxHash: flowHash,
        txHash: flowHash,
        createdAt: new Date().toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
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
        <p className="font-bold text-emerald-900">Rental active!</p>
        <p className="mt-1 text-sm text-emerald-800">
          Deposit locked in escrow. Rental streams to {listing.ownerName} at{" "}
          {flowRateLabel(listing.dailyRateG$)}. Coordinate pickup, then the
          owner confirms return to release your deposit.
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
    <VerificationGate action="rent this item">
      <div className="surface-elevated space-y-4 p-5 sm:p-6">
        <div>
          <p className="text-sm font-semibold text-muted">Rental period</p>
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
            <span className="w-16 text-right text-sm font-bold">{days} days</span>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl bg-surface-hover p-4 text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Waves className="h-4 w-4 text-primary" />
              Rental stream
            </span>
            <span className="text-right font-semibold">
              {flowRateLabel(listing.dailyRateG$)}
              <span className="block text-xs font-medium text-muted">
                ~{formatG$(rentalTotal)} G$ over {days}d
              </span>
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Shield className="h-4 w-4 text-primary" />
              Escrow deposit
            </span>
            <span className="font-semibold">
              {formatG$(listing.depositG$)} G$
              <span className="block text-xs font-medium text-muted">
                Refunded on return
              </span>
            </span>
          </div>
        </div>

        {address && balance !== undefined ? (
          <p className="text-xs text-muted">
            Your balance: {formatG$(balance)} G$ · Need ~{formatG$(requiredG$)} G$
            for this rental
          </p>
        ) : null}

        <ol className="space-y-2 text-xs text-muted">
          <li className={step === "approving" ? "font-semibold text-primary" : ""}>
            1. Approve G$ for escrow
          </li>
          <li className={step === "locking" ? "font-semibold text-primary" : ""}>
            2. Lock deposit in ShareGEscrow
          </li>
          <li className={step === "streaming" ? "font-semibold text-primary" : ""}>
            3. Start Superfluid rental stream to owner
          </li>
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
              : step === "locking"
                ? "Locking deposit…"
                : "Starting stream…"
            : "Rent with escrow + stream"}
        </Button>
      </div>
    </VerificationGate>
  );
}
