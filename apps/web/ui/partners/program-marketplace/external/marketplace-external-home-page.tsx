import { getPublicNetworkPrograms } from "@/lib/fetchers/get-public-network-programs";
import {
  getMarketplaceCategoryHref,
  getMarketplacePopularHref,
} from "@/ui/partners/program-marketplace/get-marketplace-href";
import { Category } from "@dub/prisma/client";
import { FeaturedProgramsCarousel } from "./featured-programs-carousel";
import { MarketplaceExternalProgramRow } from "./marketplace-external-program-row";
import { MarketplaceExternalShell } from "./marketplace-external-shell";
import { MarketplaceExternalCategories } from "./marketplace-external-categories";

const MARKETPLACE_ROW_PAGE_SIZE = 8;

export async function MarketplaceExternalHomePage() {
  const [featuredPrograms, popularPrograms, newPrograms, productivityPrograms] =
    await Promise.all([
      getPublicNetworkPrograms({
        featured: true,
        pageSize: 6,
      }),
      getPublicNetworkPrograms({
        sortBy: "popularity",
        pageSize: MARKETPLACE_ROW_PAGE_SIZE,
      }),
      getPublicNetworkPrograms({
        sortBy: "recency",
        pageSize: MARKETPLACE_ROW_PAGE_SIZE,
      }),
      getPublicNetworkPrograms({
        category: Category.Productivity,
        pageSize: MARKETPLACE_ROW_PAGE_SIZE,
      }),
    ]);

  return (
    <MarketplaceExternalShell variant="home">
      <div className="flex flex-col gap-10">
        <FeaturedProgramsCarousel programs={featuredPrograms} />
        <MarketplaceExternalCategories />
        <MarketplaceExternalProgramRow
          title="Most popular"
          viewAllHref={getMarketplacePopularHref()}
          programs={popularPrograms}
          showViewAllCard
        />
        <MarketplaceExternalProgramRow
          title="New"
          viewAllHref={getMarketplacePopularHref({ sortBy: "recency" })}
          programs={newPrograms}
        />
        <MarketplaceExternalProgramRow
          title="Productivity"
          viewAllHref={getMarketplaceCategoryHref(Category.Productivity)}
          programs={productivityPrograms}
        />
      </div>
    </MarketplaceExternalShell>
  );
}
