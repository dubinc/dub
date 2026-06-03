"use client";

import { Category } from "@dub/prisma/client";
import { MarketplaceListToolbar } from "../marketplace-list-toolbar";
import type { ExternalMarketplaceRewardType } from "../utils/build-external-marketplace-filter-href";

export function MarketplaceExternalListToolbar({
  basePath,
  activeCategory,
  categoryCounts,
  rewardTypeCounts,
}: {
  basePath: string;
  activeCategory?: Category;
  categoryCounts: { category: Category; count: number }[];
  rewardTypeCounts: {
    type: ExternalMarketplaceRewardType;
    count: number;
  }[];
}) {
  return (
    <MarketplaceListToolbar
      variant="external"
      basePath={basePath}
      activeCategory={activeCategory}
      categoryCounts={categoryCounts}
      rewardTypeCounts={rewardTypeCounts}
    />
  );
}
