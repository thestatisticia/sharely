"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { MapPin } from "lucide-react";

import { ListingImage } from "@/components/items/ListingImage";
import { OwnerProfileCard } from "@/components/items/OwnerProfileCard";
import { RentPanel } from "@/components/items/RentPanel";
import { Page, Surface } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { useClientListing } from "@/hooks/useClientListing";
import { useListingRentalStatus } from "@/hooks/useListingRentalStatus";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatDistance, formatG$ } from "@/lib/format";
import { getAvailableAgainDate } from "@/lib/renter-action";

function ItemPageSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-4 w-28 rounded bg-skeleton" />
      <div className="aspect-[16/10] rounded-xl bg-skeleton" />
      <div className="h-48 rounded-xl bg-skeleton" />
    </div>
  );
}

export default function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const listing = useClientListing(id);
  const { rental: activeRental } = useListingRentalStatus(
    id,
    listing?.available ?? true,
  );
  const availableAgain =
    activeRental && !listing?.available
      ? getAvailableAgainDate(activeRental)
      : null;

  if (listing === undefined) {
    return <ItemPageSkeleton />;
  }

  if (!listing) {
    notFound();
  }

  const area = listing.area ?? listing.location.split(",")[0]?.trim();

  return (
    <Page className="gap-8">
      <Link
        href="/browse"
        className="text-sm font-medium text-accent hover:underline"
      >
        ← Back to explore
      </Link>

      <Surface className="overflow-hidden" elevated>
        <ListingImage
          src={listing.imageUrl}
          alt={listing.title}
          category={listing.category}
          aspect="wide"
          rounded="none"
          priority
          sizes="(max-width: 512px) 100vw, 448px"
        />
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{CATEGORY_LABELS[listing.category]}</Badge>
            {listing.available ? (
              <Badge className="bg-emerald-50 text-emerald-800">
                Available today
              </Badge>
            ) : (
              <Badge className="bg-amber-50 text-amber-900">
                {availableAgain
                  ? `Available again ${availableAgain}`
                  : "Currently rented"}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold leading-tight text-foreground">
            {listing.title}
          </h1>
          <p className="text-base leading-relaxed text-muted">
            {listing.description}
          </p>
          <span className="inline-flex items-center gap-2 text-base text-muted">
            <MapPin className="h-4 w-4 shrink-0 text-accent" />
            {area} · {formatDistance(listing.distanceKm)} away
          </span>

          <OwnerProfileCard listing={listing} />

          <div className="grid grid-cols-2 gap-4 rounded-xl bg-surface-hover p-4">
            <div>
              <p className="eyebrow">Daily rate</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {formatG$(listing.dailyRateG$)} G$/day
              </p>
            </div>
            <div>
              <p className="eyebrow">Security deposit</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {formatG$(listing.depositG$)} G$
              </p>
              <p className="mt-0.5 text-xs text-muted">Refunded on return</p>
            </div>
          </div>
        </div>
      </Surface>

      {listing.available ? (
        <RentPanel listing={listing} />
      ) : (
        <div className="surface-elevated p-5 text-center sm:p-6">
          <p className="font-semibold text-foreground">
            {availableAgain
              ? `Available again ${availableAgain}`
              : "Currently rented"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {availableAgain
              ? "This item is booked until the active rental ends. Save the date or browse other listings nearby."
              : "This item is booked until the active rental ends. Check back later or browse other listings nearby."}
          </p>
        </div>
      )}
    </Page>
  );
}
