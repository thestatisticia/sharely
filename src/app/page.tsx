import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

import { FeaturePills } from "@/components/home/FeaturePills";
import { ItemCard } from "@/components/items/ItemCard";
import { Page, PageHero, PageSection } from "@/components/layout/Page";
import { Button } from "@/components/ui/Button";
import { KAMPALA_CITY_LABEL } from "@/lib/kampala";
import { SEED_LISTINGS } from "@/lib/store";

export default function HomePage() {
  const featured = SEED_LISTINGS.slice(0, 3);

  return (
    <Page>
      <PageHero
        mesh
        eyebrow={KAMPALA_CITY_LABEL}
        title={
          <>
            Rent what you need.
            <br />
            Earn from what you own.
          </>
        }
        description="Find tools, electronics and equipment available near you — with verified owners, clear pricing, and refundable security deposits in G$."
      >
        <Link href="/browse">
          <Button size="lg" variant="gradient">
            Explore rentals
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/list">
          <Button size="lg" variant="secondary">
            <TrendingUp className="h-4 w-4" />
            Rent out gear
          </Button>
        </Link>
      </PageHero>

      <FeaturePills />

      <PageSection eyebrow="Marketplace" title="Popular rentals near you">
        <div className="grid gap-5">
          {featured.map((listing) => (
            <ItemCard key={listing.id} listing={listing} elevated />
          ))}
        </div>
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition hover:gap-2.5"
        >
          View available rentals
          <ArrowRight className="h-4 w-4" />
        </Link>
      </PageSection>
    </Page>
  );
}
