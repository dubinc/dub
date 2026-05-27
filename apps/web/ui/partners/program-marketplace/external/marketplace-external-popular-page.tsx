import { getPublicNetworkProgramFilterCounts } from "@/lib/fetchers/get-public-network-program-filter-counts";
import { getPublicNetworkPrograms } from "@/lib/fetchers/get-public-network-programs";
import {
  MarketplaceExternalFilterSidebar,
  getMarketplaceExternalBasePath,
} from "./marketplace-external-filters";
import { MarketplaceExternalProgramGrid } from "./marketplace-external-program-grid";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

const POPULAR_PAGE_SIZE = 12;

export async function MarketplaceExternalPopularPage({
  slug,
  searchParams,
}: {
  slug?: string[];
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const basePath = getMarketplaceExternalBasePath({ slug });

  const [programs, filterCounts] = await Promise.all([
    getPublicNetworkPrograms({
      sortBy: "popularity",
      pageSize: POPULAR_PAGE_SIZE,
    }),
    getPublicNetworkProgramFilterCounts({}),
  ]);

  return (
    <MarketplaceExternalShell variant="list">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <MarketplaceExternalFilterSidebar
          basePath={basePath}
          categoryCounts={filterCounts.categories}
          rewardTypeCounts={filterCounts.rewardTypes}
        />
        <div className="min-w-0 flex-1">
          <MarketplaceExternalProgramGrid programs={programs} />
        </div>
      </div>
    </MarketplaceExternalShell>
  );
}
