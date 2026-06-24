"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MapPin } from "lucide-react";

import { useClientListings } from "@/hooks/useClientListing";
import { Surface } from "@/components/layout/Page";
import { KAMPALA_HEATMAP_LAYOUT, countByArea, heatIntensity } from "@/lib/kampala";
import { cn } from "@/lib/utils";

export function KampalaHeatmap({
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
  const max = Math.max(1, ...Object.values(counts));

  return (
    <Surface className="p-4" elevated>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gridTemplateRows: "repeat(3, minmax(3rem, auto))",
        }}
      >
        {KAMPALA_HEATMAP_LAYOUT.map(({ area, row, col }) => {
          const count = counts[area] ?? 0;
          const intensity = heatIntensity(count, max);
          const active = selectedArea === area;
          const hot = intensity > 0.55;

          return (
            <Link
              key={area}
              href={`${basePath}?area=${encodeURIComponent(area)}`}
              className={cn(
                "flex min-h-[3rem] flex-col items-center justify-center rounded-xl px-1 py-2 text-center transition",
                active && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
              )}
              style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                backgroundColor:
                  count === 0
                    ? "var(--heatmap-empty)"
                    : `color-mix(in srgb, var(--heatmap-active) ${Math.round(intensity * 100)}%, transparent)`,
                color: hot ? "var(--canvas)" : "var(--foreground)",
              }}
            >
              <span className="text-[11px] font-semibold leading-tight">
                {area}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[10px]",
                  hot ? "opacity-90" : "text-muted",
                )}
              >
                {count === 0 ? "—" : `${count}`}
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm text-muted">
        <MapPin className="h-3.5 w-3.5" />
        Tap a neighborhood to filter
      </p>
    </Surface>
  );
}

export function KampalaAreaPill({
  area,
  onClear,
}: {
  area: string;
  onClear?: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent">
      <MapPin className="h-3.5 w-3.5" />
      {area}, Kampala
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 rounded-full px-1.5 text-muted hover:text-foreground"
          aria-label="Clear area filter"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export function matchesAreaFilter(
  listing: { area?: string; location: string },
  area: string,
) {
  const listingAreaName =
    listing.area ?? listing.location.split(",")[0]?.trim() ?? "";
  return listingAreaName.toLowerCase() === area.toLowerCase();
}
