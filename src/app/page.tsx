import Link from "next/link";
import { ArrowRight, Compass, TrendingUp } from "lucide-react";

import { FeaturedListings } from "@/components/home/FeaturedListings";
import { FeaturePills } from "@/components/home/FeaturePills";
import { Page, PageHero } from "@/components/layout/Page";
import { Button } from "@/components/ui/Button";
import { KAMPALA_CITY_LABEL } from "@/lib/kampala";

export default function HomePage() {
  return (
    <Page className="gap-10">
      <PageHero
        mesh
        eyebrow={KAMPALA_CITY_LABEL}
        title={
          <>
            Find items to rent.
            <br />
            Earn from what you own.
          </>
        }
        description="Discover verified listings from real owners in Kampala — tools, electronics, and everyday items. Rent with G$, protected by escrow deposits and clear daily rates."
      >
        <Link href="/browse" className="w-full sm:w-auto">
          <Button size="lg" variant="gradient" fullWidth className="sm:w-auto">
            <Compass className="h-4 w-4" />
            Find items to rent
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/list" className="w-full sm:w-auto">
          <Button size="lg" variant="secondary" fullWidth className="sm:w-auto">
            <TrendingUp className="h-4 w-4" />
            Rent out items
          </Button>
        </Link>
      </PageHero>

      <FeaturePills />

      <FeaturedListings />
    </Page>
  );
}
