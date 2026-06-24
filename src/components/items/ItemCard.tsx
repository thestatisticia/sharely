import Link from "next/link";

import { ListingImage } from "@/components/items/ListingImage";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatDistance, formatG$ } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ItemCard({
  listing,
  className,
  elevated = false,
}: {
  listing: Listing;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <Link
      href={`/item/${listing.id}`}
      className={cn(
        "group block overflow-hidden transition-transform duration-300 hover:-translate-y-0.5",
        elevated ? "surface-elevated" : "surface",
        className,
      )}
    >
      <div className="relative overflow-hidden">
        <ListingImage
          src={listing.imageUrl}
          alt={listing.title}
          category={listing.category}
          aspect="landscape"
          rounded="none"
          sizes="(max-width: 512px) 100vw, 448px"
          imageClassName="transition duration-700 group-hover:scale-[1.04]"
          showGradient
        />
        <div className="absolute bottom-3 left-3">
          <span className="price-chip text-sm text-foreground">
            {formatG$(listing.dailyRateG$)}
            <span className="text-xs font-medium text-muted">G$/day</span>
          </span>
        </div>
        <div className="absolute right-3 top-3">
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
            {CATEGORY_LABELS[listing.category]}
          </span>
        </div>
      </div>
      <div className="space-y-1.5 p-4 sm:p-5">
        <h3 className="text-lg font-bold leading-snug text-foreground">
          {listing.title}
        </h3>
        <p className="text-sm text-muted">
          {listing.location} · {formatDistance(listing.distanceKm)}
        </p>
      </div>
    </Link>
  );
}

export function FeaturedItemCard({ listing }: { listing: Listing }) {
  return <ItemCard listing={listing} elevated />;
}
