import Link from "next/link";
import { CheckCircle2, MapPin, Star } from "lucide-react";

import { ListingImage } from "@/components/items/ListingImage";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatDistance, formatG$ } from "@/lib/format";
import { getOwnerProfile } from "@/lib/owner-profile";
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
  const owner = getOwnerProfile(listing.ownerAddress, listing.ownerName);
  const area = listing.area ?? listing.location.split(",")[0]?.trim();

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
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
            {CATEGORY_LABELS[listing.category]}
          </span>
          {listing.available ? (
            <span className="rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              Available today
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div>
          <h3 className="text-lg font-bold leading-snug text-foreground">
            {listing.title}
          </h3>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {owner.rating} · {owner.displayName}
          </p>
        </div>

        <p className="inline-flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
          {area} · {formatDistance(listing.distanceKm)} away
        </p>

        <div className="flex items-end justify-between gap-3 border-t border-border/60 pt-3">
          <div>
            <p className="text-xl font-bold text-foreground">
              {formatG$(listing.dailyRateG$)} G$
              <span className="text-sm font-semibold text-muted">/day</span>
            </p>
            <p className="text-sm font-medium text-muted">
              Deposit {formatG$(listing.depositG$)} G$
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified owner
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedItemCard({ listing }: { listing: Listing }) {
  return <ItemCard listing={listing} elevated />;
}
