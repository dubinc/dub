import { getNetworkProgramCounts } from "@/lib/fetchers/get-network-program-counts";
import { getPublicNetworkPrograms } from "@/lib/fetchers/get-public-network-programs";
import { EXTERNAL_MARKETPLACE_PAGE_SIZE } from "@/lib/marketplace/parse-public-marketplace-query";
import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { Category } from "@prisma/client";
import {
  MarketplaceProgramGrid,
  MarketplaceProgramGridEmpty,
} from "../marketplace-program-grid";
import {
  getMarketplaceExternalBasePath,
  MarketplaceExternalFilterSidebar,
} from "./marketplace-external-filters";
import { MarketplaceExternalListPageClient } from "./marketplace-external-list-page-client";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

export async function MarketplaceExternalListPage({
  segments,
  fixedCategory,
}: {
  segments: string[];
  fixedCategory?: Category;
}) {
  const basePath = getMarketplaceExternalBasePath({ segments });
  const categoryMeta = fixedCategory
    ? PROGRAM_CATEGORIES_MAP[fixedCategory]
    : undefined;

  const [initialPrograms, initialCounts] = await Promise.all([
    getPublicNetworkPrograms({
      category: fixedCategory,
      page: 1,
      pageSize: EXTERNAL_MARKETPLACE_PAGE_SIZE,
    }),
    getNetworkProgramCounts({ category: fixedCategory }),
  ]);

  const defaultSidebar = (
    <MarketplaceExternalFilterSidebar
      basePath={basePath}
      activeCategory={fixedCategory}
      categoryCounts={initialCounts.categories}
      rewardTypeCounts={initialCounts.rewardTypes}
    />
  );

  const defaultGrid =
    initialPrograms.length > 0 ? (
      <MarketplaceProgramGrid programs={initialPrograms} showStatus={false} />
    ) : (
      <MarketplaceProgramGridEmpty />
    );

  return (
    <MarketplaceExternalShell
      variant="list"
      title={
        categoryMeta ? (
          <>
            {categoryMeta.label} partner
            <br />
            programs
          </>
        ) : undefined
      }
      description={categoryMeta?.listPageDescription}
    >
      <MarketplaceExternalListPageClient
        basePath={basePath}
        fixedCategory={fixedCategory}
        initialCounts={initialCounts}
        defaultGrid={defaultGrid}
        defaultSidebar={defaultSidebar}
      />
    </MarketplaceExternalShell>
  );
}
