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

const KampalaHeatmap = dynamic(
  () =>
    import("@/components/kampala/KampalaHeatmap").then((m) => m.KampalaHeatmap),
  {
    loading: () => (
      <div className="h-36 animate-pulse rounded-xl bg-skeleton" />
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
        title="Browse items"
        description="Tools, electronics, and gear from verified neighbors."
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
          placeholder="Search drills, tents, generators…"
          className="pl-11"
        />
      </div>

      <PageSection eyebrow="Kampala" title="Neighborhoods">
        <KampalaHeatmap selectedArea={area} />
      </PageSection>

      <PageSection title="All listings">
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
