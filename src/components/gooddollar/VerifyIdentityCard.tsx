"use client";

import { useState } from "react";
import { useIdentitySDK } from "@goodsdks/react-hooks";
import { SupportedChains } from "@goodsdks/citizen-sdk";
import { ShieldCheck, Loader2, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useVerificationState } from "@/hooks/useGoodDollar";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { shortenAddress } from "@/lib/format";

export function VerifyIdentityCard({ onStarted }: { onStarted?: () => void }) {
  const verification = useVerificationState();
  const { sdk, loading: sdkLoading, error: sdkError } = useIdentitySDK("production");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function startVerification() {
    if (!sdk) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const callbackUrl = `${window.location.origin}/profile?fv=complete`;
      const link = await sdk.generateFVLink(
        false,
        callbackUrl,
        SupportedChains.CELO,
      );
      onStarted?.();
      window.location.href = link;
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : "Could not start verification",
      );
      setVerifying(false);
    }
  }

  if (!verification.isConnected) {
    return (
      <div className="surface p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">GoodDollar verification</p>
            <p className="text-sm text-muted">Connect wallet to verify your identity</p>
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
        <p className="font-bold">GoodDollar verification</p>
        <p className="mt-1 text-sm text-muted">
          Switch to Celo mainnet before starting face verification.
        </p>
      </div>
    );
  }

  if (verification.isVerified) {
    return (
      <div className="surface border-success/30 bg-success/10 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
          <div>
            <p className="font-bold text-emerald-900">You&apos;re verified</p>
            <p className="mt-1 text-sm text-emerald-800">
              GoodDollar citizen — you can claim daily G$ and use SHARELY rentals.
            </p>
            {verification.root ? (
              <p className="mt-2 text-xs text-emerald-700">
                Identity root: {shortenAddress(verification.root, 6)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold">Verify your identity</p>
          <p className="text-sm text-muted">
            One-time face verification to join GoodDollar
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted">
        SHARELY uses GoodDollar&apos;s sybil-resistant identity. You&apos;ll sign a
        message, then complete a quick face check. After verification you can claim
        daily G$ and rent items.
      </p>

      {sdkError ? (
        <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{sdkError}</p>
      ) : null}

      {verifyError ? (
        <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {verifyError}
        </p>
      ) : null}

      <Button
        fullWidth
        size="lg"
        onClick={() => void startVerification()}
        disabled={!sdk || sdkLoading || verifying}
      >
        {(sdkLoading || verifying) && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        Start face verification
        <ExternalLink className="h-4 w-4" />
      </Button>

      <p className="text-center text-xs text-muted">
        Or verify at{" "}
        <a
          href="https://gooddollar.org"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primary"
        >
          gooddollar.org
        </a>
      </p>
    </div>
  );
}
