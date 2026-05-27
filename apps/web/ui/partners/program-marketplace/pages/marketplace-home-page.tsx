"use client";

import {
  getMarketplaceCategoryHref,
  getMarketplacePopularHref,
} from "@/ui/partners/program-marketplace/get-marketplace-href";
import { Category } from "@dub/prisma/client";
import { FeaturedPrograms } from "../featured-programs";
import { MarketplaceCategories } from "../marketplace-categories";
import { MarketplaceProgramRow } from "../marketplace-program-row";

const MARKETPLACE_ROW_PAGE_SIZE = 8;

export function MarketplaceHomePage() {
  return (
    <div className="flex flex-col gap-10">
      <FeaturedPrograms />
      <MarketplaceCategories />
      <MarketplaceProgramRow
        title="Most popular"
        viewAllHref={getMarketplacePopularHref()}
        apiPath={`/api/network/programs?sortBy=popularity&pageSize=${MARKETPLACE_ROW_PAGE_SIZE}`}
        showViewAllCard
      />
      <MarketplaceProgramRow
        title="New"
        viewAllHref={getMarketplacePopularHref({ sortBy: "recency" })}
        apiPath={`/api/network/programs?sortBy=recency&pageSize=${MARKETPLACE_ROW_PAGE_SIZE}`}
      />
      <MarketplaceProgramRow
        title="Productivity"
        viewAllHref={getMarketplaceCategoryHref(Category.Productivity)}
        apiPath={`/api/network/programs?category=${Category.Productivity}&pageSize=${MARKETPLACE_ROW_PAGE_SIZE}`}
      />
    </div>
  );
}
