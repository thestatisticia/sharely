import { CheckCircle2, Star, UserRound } from "lucide-react";

import { getOwnerProfile } from "@/lib/owner-profile";
import type { Listing } from "@/lib/types";

export function OwnerProfileCard({ listing }: { listing: Listing }) {
  const owner = getOwnerProfile(listing.ownerAddress, listing.ownerName);

  return (
    <div className="rounded-2xl border border-border/70 bg-surface-hover/60 p-4">
      <p className="eyebrow">Listed by</p>
      <div className="mt-3 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <UserRound className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground">{owner.displayName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {owner.verified ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {owner.rating} owner
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {owner.rentalCount} successful rentals
          </p>
        </div>
      </div>
    </div>
  );
}
