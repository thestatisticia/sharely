import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
            Rent neighbor gear with{" "}
            <span className="text-gradient">daily G$</span>
          </>
        }
        description="Verified Kampala citizens list tools and electronics. Renters pay streaming G$ and lock refundable deposits on Celo."
      >
        <Link href="/browse">
          <Button size="lg" variant="gradient">
            Explore listings
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/profile">
          <Button size="lg" variant="secondary">
            Claim G$
          </Button>
        </Link>
      </PageHero>

      <FeaturePills />

      <PageSection eyebrow="Marketplace" title="Popular near you">
        <div className="grid gap-5">
          {featured.map((listing) => (
            <ItemCard key={listing.id} listing={listing} elevated />
          ))}
        </div>
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition hover:gap-2.5"
        >
          View all listings
          <ArrowRight className="h-4 w-4" />
        </Link>
      </PageSection>
    </Page>
  );
}
