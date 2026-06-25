"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, MapPin } from "lucide-react";

import { useClientListings } from "@/hooks/useClientListing";
import { Surface } from "@/components/layout/Page";
import { KAMPALA_AREAS, countByArea } from "@/lib/kampala";
import { cn } from "@/lib/utils";

export function NearbyAreas({
  selectedArea,
  basePath = "/browse",
}: {
  selectedArea?: string | null;
  basePath?: string;
}) {
  const { listings, loading } = useClientListings();
  const counts = useMemo(
    () => (loading ? countByArea([]) : countByArea(listings)),
    [listings, loading],
  );

  const ranked = useMemo(
    () =>
      [...KAMPALA_AREAS]
        .map((area) => ({ area, count: counts[area] ?? 0 }))
        .sort((a, b) => b.count - a.count),
    [counts],
  );

  const total = ranked.reduce((sum, row) => sum + row.count, 0);

  return (
    <Surface className="p-4 sm:p-5" elevated>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Inventory near you
        </p>
        <h3 className="mt-1 text-lg font-bold text-foreground">Find items near you</h3>
        <p className="mt-1 text-sm text-muted">
          {total} rentals available across Kampala
        </p>
      </div>

      <ul className="space-y-2">
        {ranked.map(({ area, count }) => {
          const active = selectedArea === area;
          return (
            <li key={area}>
              <Link
                href={`${basePath}?area=${encodeURIComponent(area)}`}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3 transition",
                  active
                    ? "border-accent/60 bg-accent-soft/50"
                    : "border-border/60 bg-surface-hover/40 hover:border-accent/30 hover:bg-surface-hover",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-accent" />
                  <div>
                    <p className="font-semibold text-foreground">{area}</p>
                    <p className="text-sm text-muted">
                      {count === 0 ? "No items yet" : `${count} item${count === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
