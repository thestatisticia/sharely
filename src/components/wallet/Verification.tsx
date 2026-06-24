"use client";

import Link from "next/link";
import { useSwitchChain } from "wagmi";
import { celo } from "viem/chains";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CELO_CHAIN_ID } from "@/lib/contracts";
import { shortenAddress } from "@/lib/format";
import { useWalletModal } from "@/components/wallet/WalletModal";
import { useVerificationState } from "@/hooks/useGoodDollar";

export function VerificationGate({
  children,
  action = "continue",
}: {
  children: React.ReactNode;
  action?: string;
}) {
  const state = useVerificationState();
  const { openModal } = useWalletModal();
  const { switchChain } = useSwitchChain();

  if (state.status === "verified" || state.canParticipate) {
    return <>{children}</>;
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      {state.status === "disconnected" ? (
        <>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="font-bold">Wallet required</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            Connect on Celo to {action}.
          </p>
          <Button className="mt-4" fullWidth onClick={openModal}>
            Connect wallet
          </Button>
        </>
      ) : null}

      {state.status === "wrong-chain" ? (
        <>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="font-bold">Switch to Celo</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            G$ rentals only work on Celo mainnet (chain {CELO_CHAIN_ID}).
          </p>
          <Button
            className="mt-4"
            fullWidth
            onClick={() => switchChain({ chainId: celo.id })}
          >
            Switch network
          </Button>
        </>
      ) : null}

      {state.status === "loading" ? (
        <div className="flex items-center gap-3 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Verifying GoodDollar identity on-chain…
        </div>
      ) : null}

      {state.status === "unverified" ? (
        <>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="font-bold">Verification required</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            Only verified GoodDollar citizens can {action}. Your connected wallet{" "}
            {state.address ? shortenAddress(state.address) : ""} is not linked
            to a verified identity root.
          </p>
          <Link href="/profile">
            <Button className="mt-4" fullWidth>
              Verify in Profile
            </Button>
          </Link>
        </>
      ) : null}

      {state.status === "expired" ? (
        <>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="font-bold">Re-verification required</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            Your GoodDollar identity has expired. Re-verify to {action}.
          </p>
          <Link href="/profile">
            <Button className="mt-4" fullWidth>
              Re-verify in Profile
            </Button>
          </Link>
        </>
      ) : null}
    </div>
  );
}

export function VerificationBadge({
  size = "sm",
}: {
  size?: "sm" | "lg";
}) {
  const state = useVerificationState();

  if (!state.isConnected) return null;

  const sizeClass =
    size === "lg"
      ? "gap-2 rounded-2xl px-4 py-2 text-sm"
      : "gap-1 rounded-full px-2.5 py-1 text-xs";

  if (state.status === "loading") {
    return (
      <span
        className={`inline-flex items-center font-semibold text-muted bg-skeleton ${sizeClass}`}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking…
      </span>
    );
  }

  if (state.status === "wrong-chain") {
    return (
      <span
        className={`inline-flex items-center font-semibold text-amber-800 bg-amber-50 ${sizeClass}`}
      >
        Wrong network
      </span>
    );
  }

  if (state.status === "expired") {
    return (
      <span
        className={`inline-flex items-center font-semibold text-amber-800 bg-amber-50 ${sizeClass}`}
      >
        <AlertCircle className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        Expired
      </span>
    );
  }

  if (state.status === "verified") {
    return (
      <span
        className={`inline-flex items-center font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 ${sizeClass}`}
      >
        <ShieldCheck className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        Verified citizen
        {state.daysUntilExpiry !== undefined && state.daysUntilExpiry <= 30
          ? ` · ${state.daysUntilExpiry}d left`
          : ""}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-semibold text-amber-800 bg-amber-50 ${sizeClass}`}
    >
      <AlertCircle className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      Not verified
    </span>
  );
}

export function ProfileVerifiedBanner() {
  const state = useVerificationState();

  if (!state.isConnected || state.status === "loading") return null;

  if (state.status === "verified") {
    return (
      <div className="surface border-success/30 bg-success/10 flex items-start gap-3 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-emerald-900">Verified renter & owner</p>
            <VerificationBadge />
          </div>
          <p className="mt-1 text-sm text-emerald-800">
            Your wallet is a GoodDollar citizen on Celo. You can list items, rent
            from neighbors, and claim daily G$.
          </p>
          {state.address ? (
            <p className="mt-2 font-mono text-xs text-emerald-700/80">
              {state.address}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}

export function VerificationCard() {
  const state = useVerificationState();
  const { openModal } = useWalletModal();

  return (
    <div className="rounded-2xl bg-surface-hover p-4 text-sm">
      <p className="font-semibold">Identity status</p>
      {state.status === "verified" ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-start gap-2 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">GoodDollar citizen verified</p>
              <p className="text-xs text-muted">
                Eligible to list, rent, and claim G$ on SHARELY
              </p>
              {state.root ? (
                <p className="mt-1 text-xs text-muted">
                  Identity root: {shortenAddress(state.root, 6)}
                </p>
              ) : null}
            </div>
          </div>
          <VerificationBadge size="lg" />
        </div>
      ) : state.status === "expired" ? (
        <p className="mt-2 text-amber-800">
          Identity expired — re-verify on Profile to claim and rent.
        </p>
      ) : (
        <p className="mt-2 text-muted">
          {state.status === "disconnected"
            ? "Connect wallet to check verification."
            : state.status === "wrong-chain"
              ? "Switch to Celo to verify."
              : state.status === "loading"
                ? "Reading Identity contract…"
                : "Complete face verification on GoodDollar."}
        </p>
      )}
      {state.status === "disconnected" ? (
        <Button className="mt-3" size="sm" onClick={openModal}>
          Connect
        </Button>
      ) : null}
    </div>
  );
}
