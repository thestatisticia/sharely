"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Loader2, PackageOpen } from "lucide-react";

import { RentalCard } from "@/components/rentals/RentalCard";
import { Page, PageHero, Surface } from "@/components/layout/Page";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useClientRentals } from "@/hooks/useClientRentals";

export default function RentalsPage() {
  const { address, isConnected } = useAccount();
  const { rentals, loading, error, reload } = useClientRentals(address);

  const renting = rentals.filter(
    (r) => r.renterAddress.toLowerCase() === address?.toLowerCase(),
  );
  const lending = rentals.filter(
    (r) => r.ownerAddress.toLowerCase() === address?.toLowerCase(),
  );

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
        description="Synced across devices — owners see bookings instantly when renters reserve an item."
      />

      <Surface className="p-4 text-sm text-muted">
        <p>
          <strong className="text-foreground">Owners:</strong> bookings appear under{" "}
          <em>Renting out</em>. Earnings stream to your G$ wallet — no claim needed.
        </p>
        <p className="mt-2">
          <strong className="text-foreground">Renters:</strong> confirm pickup to
          start payments, then stop the stream when done.
        </p>
      </Surface>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Surface className="p-6 text-center text-sm text-red-700">
          {error}
        </Surface>
      ) : rentals.length === 0 ? (
        <div className="surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
            <PackageOpen className="h-7 w-7" />
          </div>
          <p className="mt-4 font-semibold">No rentals yet</p>
          <p className="mt-1 text-sm text-muted">
            When someone books your item (or you book one), it appears here for
            both wallets.
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
          {lending.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">
                Renting out ({lending.length})
              </h2>
              <p className="text-sm text-muted">
                Items others have booked from you.
              </p>
              {lending.map((rental) => (
                <RentalCard
                  key={rental.id}
                  rental={rental}
                  onUpdated={reload}
                />
              ))}
            </section>
          ) : null}

          {renting.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">Renting ({renting.length})</h2>
              <p className="text-sm text-muted">Items you booked from owners.</p>
              {renting.map((rental) => (
                <RentalCard
                  key={rental.id}
                  rental={rental}
                  onUpdated={reload}
                />
              ))}
            </section>
          ) : null}
        </>
      )}
    </Page>
  );
}
