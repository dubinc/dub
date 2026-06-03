import { getPublicNetworkProgramFilterCounts } from "@/lib/fetchers/get-public-network-program-filter-counts";
import {
  getPublicNetworkPrograms,
  getPublicNetworkProgramsCount,
} from "@/lib/fetchers/get-public-network-programs";
import { getPublicNetworkProgramsQuerySchema } from "@/lib/zod/schemas/program-network";
import { Category } from "@dub/prisma/client";
import Link from "next/link";
import {
  MarketplaceProgramGrid,
  MarketplaceProgramGridEmpty,
} from "../marketplace-program-grid";
import {
  MarketplaceExternalFilterSidebar,
  getMarketplaceExternalBasePath,
} from "./marketplace-external-filters";
import { MarketplaceExternalListToolbar } from "./marketplace-external-list-toolbar";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

export async function MarketplaceExternalListPage({
  slug,
  searchParams,
  fixedCategory,
}: {
  slug?: string[];
  searchParams: Record<string, string | string[] | undefined>;
  fixedCategory?: Category;
}) {
  const { rewardType, search, sortBy, sortOrder, page } =
    getPublicNetworkProgramsQuerySchema.parse({
      rewardType: searchParams.rewardType,
      search: searchParams.search,
      sortBy: searchParams.sortBy,
      sortOrder: searchParams.sortOrder,
      page: searchParams.page,
    });

  const category = fixedCategory;
  const basePath = getMarketplaceExternalBasePath({ slug });

  const [programs, totalCount, filterCounts] = await Promise.all([
    getPublicNetworkPrograms({
      category,
      rewardType,
      search,
      sortBy,
      sortOrder,
      page,
      pageSize: 24,
    }),
    getPublicNetworkProgramsCount({
      category,
      rewardType,
      search,
    }),
    getPublicNetworkProgramFilterCounts({
      category,
      rewardType,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / 24));

  return (
    <MarketplaceExternalShell variant="list">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="hidden shrink-0 lg:block">
          <MarketplaceExternalFilterSidebar
            basePath={basePath}
            activeCategory={category}
            activeRewardType={rewardType}
            categoryCounts={filterCounts.categories}
            rewardTypeCounts={filterCounts.rewardTypes}
            search={search}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>

        <div className="@container/page flex min-w-0 flex-1 flex-col gap-6">
          <MarketplaceExternalListToolbar
            basePath={basePath}
            activeCategory={category}
            categoryCounts={filterCounts.categories}
            rewardTypeCounts={filterCounts.rewardTypes}
          />
          {programs.length > 0 ? (
            <MarketplaceProgramGrid programs={programs} showStatus={false} />
          ) : (
            <MarketplaceProgramGridEmpty />
          )}
          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;
                const params = new URLSearchParams();

                if (rewardType) params.set("rewardType", rewardType);
                if (search) params.set("search", search);
                if (sortBy !== "popularity") params.set("sortBy", sortBy);
                if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
                if (pageNumber > 1) params.set("page", String(pageNumber));

                const queryString = params.toString();

                return (
                  <Link
                    key={pageNumber}
                    href={`${basePath}${queryString ? `?${queryString}` : ""}`}
                    className={
                      pageNumber === page
                        ? "rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
                        : "border-border-subtle hover:bg-bg-subtle rounded-lg border px-3 py-1.5 text-sm font-medium"
                    }
                  >
                    {pageNumber}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </MarketplaceExternalShell>
  );
}
