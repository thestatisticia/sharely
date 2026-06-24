"use client";

import { useState } from "react";

import { useClientListings } from "@/hooks/useClientListing";
import { matchesAreaFilter } from "@/components/kampala/KampalaHeatmap";
import { ItemCard } from "@/components/items/ItemCard";
import { Surface } from "@/components/layout/Page";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import type { ItemCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BrowseGrid({
  query = "",
  area,
}: {
  query?: string;
  area?: string;
}) {
  const [category, setCategory] = useState<ItemCategory | "all">("all");
  const { listings, loading } = useClientListings();

  const filtered = listings.filter((listing) => {
    const matchesCategory =
      category === "all" ? true : listing.category === category;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      listing.title.toLowerCase().includes(q) ||
      listing.location.toLowerCase().includes(q) ||
      listing.description.toLowerCase().includes(q);
    const matchesArea = area ? matchesAreaFilter(listing, area) : true;
    return matchesCategory && matchesQuery && matchesArea && listing.available;
  });

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["all", ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all",
              category === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4">
          <div className="h-56 animate-pulse rounded-2xl bg-skeleton" />
          <div className="h-56 animate-pulse rounded-2xl bg-skeleton" />
        </div>
      ) : filtered.length === 0 ? (
        <Surface className="p-10 text-center" elevated>
          <p className="font-semibold text-foreground">No items found</p>
          <p className="mt-2 text-muted">Try another filter or list your first item.</p>
        </Surface>
      ) : (
        <div className="grid gap-4">
          {filtered.map((listing) => (
            <ItemCard key={listing.id} listing={listing} elevated />
          ))}
        </div>
      )}
    </div>
  );
}
