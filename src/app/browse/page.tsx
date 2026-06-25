"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Suspense, useState } from "react";

import { KampalaAreaPill } from "@/components/kampala/KampalaHeatmap";
import { Page, PageHero, PageSection } from "@/components/layout/Page";
import { Input } from "@/components/ui/Field";
import { KAMPALA_CITY_LABEL } from "@/lib/kampala";

const BrowseGrid = dynamic(
  () => import("@/components/items/BrowseGrid").then((m) => m.BrowseGrid),
  {
    loading: () => (
      <div className="animate-pulse space-y-3">
        <div className="h-12 rounded-xl bg-skeleton" />
        <div className="h-52 rounded-xl bg-skeleton" />
      </div>
    ),
    ssr: false,
  },
);

const NearbyAreas = dynamic(
  () =>
    import("@/components/kampala/NearbyAreas").then((m) => m.NearbyAreas),
  {
    loading: () => (
      <div className="h-48 animate-pulse rounded-xl bg-skeleton" />
    ),
    ssr: false,
  },
);

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const area = searchParams.get("area");
  const [query, setQuery] = useState("");

  return (
    <Page>
      <PageHero
        eyebrow={KAMPALA_CITY_LABEL}
        title="Explore rentals"
        description="Rent equipment from verified owners nearby — clear daily rates, deposits, and instant G$ payments."
      />

      {area ? (
        <KampalaAreaPill
          area={area}
          onClear={() => router.push("/browse")}
        />
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search drills, speakers, generators…"
          className="pl-11"
        />
      </div>

      <PageSection title="Available nearby">
        <NearbyAreas selectedArea={area} />
      </PageSection>

      <PageSection title="Items near you">
        <BrowseGrid query={query} area={area ?? undefined} />
      </PageSection>
    </Page>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4 px-2">
          <div className="h-10 w-2/3 rounded-lg bg-skeleton" />
          <div className="h-12 rounded-xl bg-skeleton" />
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
