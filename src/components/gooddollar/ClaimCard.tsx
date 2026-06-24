"use client";

import { useCallback, useEffect, useState } from "react";
import { useClaimSDK } from "@goodsdks/react-hooks";
import { Gift, Loader2, Clock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useGBalance, useVerificationState } from "@/hooks/useGoodDollar";
import { formatG$ } from "@/lib/format";

type ClaimStatus = "not_whitelisted" | "can_claim" | "already_claimed" | null;

export function ClaimCard({ onClaimed }: { onClaimed?: () => void }) {
  const verification = useVerificationState();
  const { refetch: refetchBalance } = useGBalance();
  const { sdk, loading: sdkLoading, error: sdkError } = useClaimSDK("production");

  const [status, setStatus] = useState<ClaimStatus>(null);
  const [entitlement, setEntitlement] = useState<bigint | null>(null);
  const [nextClaim, setNextClaim] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!sdk || !verification.isConnected) return;
    setChecking(true);
    setClaimError(null);
    try {
      const result = await sdk.getWalletClaimStatus();
      setStatus(result.status);
      setEntitlement(result.entitlement);
      setNextClaim(result.nextClaimTime ?? null);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Could not check claim status");
    } finally {
      setChecking(false);
    }
  }, [sdk, verification.isConnected]);

  useEffect(() => {
    if (sdk && verification.isOnCelo && verification.isConnected) {
      void refreshStatus();
    }
  }, [sdk, verification.isOnCelo, verification.isConnected, verification.isVerified, refreshStatus]);

  async function handleClaim() {
    if (!sdk) return;
    setClaiming(true);
    setClaimError(null);
    setClaimSuccess(false);
    try {
      await sdk.claim();
      setClaimSuccess(true);
      await refreshStatus();
      await refetchBalance();
      onClaimed?.();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  if (!verification.isConnected) {
    return (
      <div className="surface p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">Daily G$ claim</p>
            <p className="text-sm text-muted">Connect wallet to claim your UBI</p>
          </div>
        </div>
        <div className="mt-4">
          <ConnectButton fullWidth />
        </div>
      </div>
    );
  }

  if (!verification.isOnCelo) {
    return (
      <div className="surface p-5">
        <p className="font-bold">Daily G$ claim</p>
        <p className="mt-1 text-sm text-muted">Switch to Celo mainnet to claim UBI.</p>
      </div>
    );
  }

  const busy = sdkLoading || checking || claiming;
  const canClaim = status === "can_claim" && entitlement !== null && entitlement > BigInt(0);

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">Daily G$ claim</p>
            <p className="text-sm text-muted">GoodDollar UBI on Celo</p>
          </div>
        </div>
        {busy ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : null}
      </div>

      {sdkError ? (
        <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{sdkError}</p>
      ) : null}

      {status === "not_whitelisted" ? (
        <p className="text-sm text-muted">
          Verify your identity first to become eligible for daily G$.
        </p>
      ) : null}

      {status === "already_claimed" ? (
        <div className="rounded-2xl bg-surface-hover p-4">
          <p className="text-sm font-semibold text-foreground">Already claimed today</p>
          {nextClaim ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3.5 w-3.5" />
              Next claim: {nextClaim.toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : null}

      {canClaim && entitlement ? (
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Available now
          </p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-900">
            {formatG$(entitlement)} G$
          </p>
        </div>
      ) : null}

      {claimSuccess ? (
        <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          Claim successful! G$ added to your wallet.
        </p>
      ) : null}

      {claimError ? (
        <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{claimError}</p>
      ) : null}

      <div className="flex gap-2">
        <Button
          fullWidth
          size="lg"
          onClick={handleClaim}
          disabled={!canClaim || busy || !sdk}
        >
          {claiming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Claiming…
            </>
          ) : (
            "Claim daily G$"
          )}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => void refreshStatus()}
          disabled={busy || !sdk}
          aria-label="Refresh claim status"
        >
          ↻
        </Button>
      </div>
    </div>
  );
}
