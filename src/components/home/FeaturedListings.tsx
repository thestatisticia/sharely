"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ItemCard } from "@/components/items/ItemCard";
import { PageSection } from "@/components/layout/Page";
import { Button } from "@/components/ui/Button";
import { useClientListings } from "@/hooks/useClientListing";

export function FeaturedListings() {
  const { listings, loading } = useClientListings();
  const featured = listings.slice(0, 3);

  return (
    <PageSection
      eyebrow="For renters"
      title="Items available near you"
      description="Real listings from verified owners — book with G$ and escrow-protected deposits."
    >
      {loading ? (
        <div className="grid gap-4">
          <div className="h-56 animate-pulse rounded-2xl bg-skeleton" />
          <div className="h-56 animate-pulse rounded-2xl bg-skeleton" />
        </div>
      ) : featured.length === 0 ? (
        <div className="surface-elevated p-8 text-center">
          <p className="font-semibold text-foreground">No items listed yet</p>
          <p className="mt-2 text-sm text-muted">
            Be the first to rent out an item, or check back as more owners join
            the marketplace.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/browse">
              <Button variant="secondary" fullWidth>
                Browse explore
              </Button>
            </Link>
            <Link href="/list">
              <Button fullWidth>List an item</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5">
          {featured.map((listing) => (
            <ItemCard key={listing.id} listing={listing} elevated />
          ))}
        </div>
      )}

      <Link
        href="/browse"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition hover:gap-2.5"
      >
        Find more items to rent
        <ArrowRight className="h-4 w-4" />
      </Link>
    </PageSection>
  );
}
