"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Smartphone, Wallet } from "lucide-react";

import { ClaimCard } from "@/components/gooddollar/ClaimCard";
import { VerifyIdentityCard } from "@/components/gooddollar/VerifyIdentityCard";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import {
  ProfileVerifiedBanner,
  VerificationBadge,
  VerificationCard,
} from "@/components/wallet/Verification";
import { useGBalance, useVerificationState } from "@/hooks/useGoodDollar";
import { Badge } from "@/components/ui/Badge";
import { Page, PageHero } from "@/components/layout/Page";
import { shortenAddress } from "@/lib/format";

const minipaySteps = [
  "Open MiniPay → Profile → About",
  "Tap the version number ~10 times to enable Developer Mode",
  "Go to Developer Settings → Test App",
  "Enter this site URL and open SHARELY inside MiniPay",
  "Connect wallet and pay with G$ on Celo",
];

function ProfileFvCallback() {
  const searchParams = useSearchParams();
  const { refetch } = useVerificationState();

  useEffect(() => {
    if (searchParams.get("fv") === "complete") {
      void refetch();
      const url = new URL(window.location.href);
      url.searchParams.delete("fv");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams, refetch]);

  return null;
}

export default function ProfilePage() {
  const { address, isConnected, refetch: refetchVerification } =
    useVerificationState();
  const { balanceLabel, isLoading, refetch: refetchBalance } = useGBalance();

  return (
    <Page className="gap-8">
      <Suspense fallback={null}>
        <ProfileFvCallback />
      </Suspense>

      <PageHero
        title="Profile"
        description="Claim daily G$, verify identity, and manage your wallet."
      />

      <ProfileVerifiedBanner />

      <VerifyIdentityCard onStarted={() => void refetchVerification()} />

      <ClaimCard
        onClaimed={() => {
          void refetchBalance();
          void refetchVerification();
        }}
      />

      <div className="surface space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted">Connected wallet</p>
              <p className="font-bold">
                {isConnected && address
                  ? shortenAddress(address, 5)
                  : "Not connected"}
              </p>
              {isConnected ? (
                <div className="mt-2">
                  <VerificationBadge size="lg" />
                </div>
              ) : null}
            </div>
          </div>
          <ConnectButton compact />
        </div>

        <div className="rounded-2xl bg-surface-hover p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            G$ balance (Celo)
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary">
            {isLoading ? "…" : balanceLabel}
            <span className="ml-1 text-sm font-semibold text-muted">G$</span>
          </p>
        </div>

        <VerificationCard />
      </div>

      <div className="surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">Use SHARELY in MiniPay</p>
            <Badge tone="warning" className="mt-1">
              Recommended on mobile
            </Badge>
          </div>
        </div>
        <ol className="space-y-3">
          {minipaySteps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">
                {index + 1}
              </span>
              <span className="text-muted">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </Page>
  );
}
