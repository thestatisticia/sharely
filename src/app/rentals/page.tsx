"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { PackageOpen } from "lucide-react";

import { RentalCard } from "@/components/rentals/RentalCard";
import { Page, PageHero } from "@/components/layout/Page";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { getRentalsForWallet } from "@/lib/store";

export default function RentalsPage() {
  const { address, isConnected } = useAccount();
  const [refreshKey, setRefreshKey] = useState(0);

  const rentals = useMemo(
    () => getRentalsForWallet(address),
    [address, refreshKey],
  );

  const renting = rentals.filter(
    (r) => r.renterAddress.toLowerCase() === address?.toLowerCase(),
  );
  const lending = rentals.filter(
    (r) => r.ownerAddress.toLowerCase() === address?.toLowerCase(),
  );

  const onUpdated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (!isConnected || !address) {
    return (
      <Page className="gap-8">
        <PageHero
          title="My rentals"
          description="Connect your wallet to manage active rentals and payouts."
        />
        <div className="surface p-8 text-center">
          <ConnectButton fullWidth />
        </div>
      </Page>
    );
  }

  return (
    <Page className="gap-8">
      <PageHero
        title="My rentals"
        description="Track rentals you booked and items you rent out — confirm returns, stop streams, and claim deposits."
      />

      {rentals.length === 0 ? (
        <div className="surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
            <PackageOpen className="h-7 w-7" />
          </div>
          <p className="mt-4 font-semibold">No rentals yet</p>
          <p className="mt-1 text-sm text-muted">
            Explore rentals and pay with G$ to see activity here.
          </p>
          <Link
            href="/browse"
            className="mt-4 inline-block text-sm font-semibold text-primary"
          >
            Explore rentals →
          </Link>
        </div>
      ) : (
        <>
          {renting.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">Renting ({renting.length})</h2>
              {renting.map((rental) => (
                <RentalCard
                  key={rental.id}
                  rental={rental}
                  onUpdated={onUpdated}
                />
              ))}
            </section>
          ) : null}

          {lending.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">Lending ({lending.length})</h2>
              {lending.map((rental) => (
                <RentalCard
                  key={rental.id}
                  rental={rental}
                  onUpdated={onUpdated}
                />
              ))}
            </section>
          ) : null}
        </>
      )}
    </Page>
  );
}
