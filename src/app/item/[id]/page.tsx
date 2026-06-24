"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { MapPin, UserRound } from "lucide-react";

import { ListingImage } from "@/components/items/ListingImage";
import { RentPanel } from "@/components/items/RentPanel";
import { Page, Surface } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { VerificationBadge } from "@/components/wallet/Verification";
import { useClientListing } from "@/hooks/useClientListing";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatDistance, formatG$ } from "@/lib/format";

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

  if (listing === undefined) {
    return <ItemPageSkeleton />;
  }

  if (!listing) {
    notFound();
  }

  return (
    <Page className="gap-8">
      <Link
        href="/browse"
        className="text-sm font-medium text-accent hover:underline"
      >
        ← Back to browse
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
            <VerificationBadge />
          </div>
          <h1 className="text-2xl font-semibold leading-tight text-foreground">
            {listing.title}
          </h1>
          <p className="text-base leading-relaxed text-muted">
            {listing.description}
          </p>
          <div className="flex flex-col gap-2 text-base text-muted sm:flex-row sm:gap-6">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              {listing.location} · {formatDistance(listing.distanceKm)}
            </span>
            <span className="inline-flex items-center gap-2">
              <UserRound className="h-4 w-4 shrink-0" />
              {listing.ownerName}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-surface-hover p-4">
            <div>
              <p className="eyebrow">Daily rate</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {formatG$(listing.dailyRateG$)} G$
              </p>
            </div>
            <div>
              <p className="eyebrow">Deposit</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {formatG$(listing.depositG$)} G$
              </p>
            </div>
          </div>
        </div>
      </Surface>

      <RentPanel listing={listing} />
    </Page>
  );
}
