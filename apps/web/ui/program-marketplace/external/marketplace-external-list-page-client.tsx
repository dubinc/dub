"use client";

import { EXTERNAL_MARKETPLACE_PAGE_SIZE } from "@/lib/marketplace/parse-public-marketplace-query";
import { NetworkProgramProps } from "@/lib/types";
import { getPublicNetworkProgramsQuerySchema } from "@/lib/zod/schemas/program-network";
import { Category } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { type MarketplaceRewardType } from "../constants";
import { MarketplaceListToolbar } from "../marketplace-list-toolbar";
import {
  MarketplaceProgramGrid,
  MarketplaceProgramGridEmpty,
  MarketplaceProgramGridSkeleton,
} from "../marketplace-program-grid";
import { MarketplaceExternalFilterSidebar } from "./marketplace-external-filters";

const PAGE_SIZE = EXTERNAL_MARKETPLACE_PAGE_SIZE;

type FilterCounts = {
  categories: { category: Category; count: number }[];
  rewardTypes: {
    type: MarketplaceRewardType;
    count: number;
  }[];
};

function pickString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function MarketplaceExternalListPageClient({
  basePath,
  fixedCategory,
}: {
  basePath: string;
  fixedCategory?: Category;
}) {
  const router = useRouter();
  const { getQueryString, searchParamsObj } = useRouterStuff();

  const parsed = useMemo(
    () =>
      getPublicNetworkProgramsQuerySchema.safeParse({
        rewardType: pickString(searchParamsObj.rewardType),
        search: pickString(searchParamsObj.search),
        sortBy: pickString(searchParamsObj.sortBy),
        sortOrder: pickString(searchParamsObj.sortOrder),
        page: pickString(searchParamsObj.page),
        pageSize: PAGE_SIZE,
        ...(fixedCategory ? { category: fixedCategory } : {}),
      }),
    [fixedCategory, searchParamsObj],
  );

  useEffect(() => {
    if (!parsed.success) {
      router.replace(basePath);
    }
  }, [basePath, parsed.success, router]);

  const queryString = parsed.success
    ? getQueryString({
        ...(fixedCategory ? { category: fixedCategory } : {}),
        pageSize: String(PAGE_SIZE),
      })
    : null;

  const { data: programs, isValidating } = useSWR<NetworkProgramProps[]>(
    queryString ? `/api/marketplace/programs${queryString}` : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const { data: totalCount = 0 } = useSWR<number>(
    queryString ? `/api/marketplace/programs/count${queryString}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: filterCounts } = useSWR<FilterCounts>(
    queryString
      ? `/api/marketplace/programs/filter-counts${queryString}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (!parsed.success) {
    return <MarketplaceProgramGridSkeleton />;
  }

  const { rewardType, search, sortBy, sortOrder, page = 1 } = parsed.data;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      {filterCounts ? (
        <div className="hidden shrink-0 lg:block">
          <MarketplaceExternalFilterSidebar
            basePath={basePath}
            activeCategory={fixedCategory}
            activeRewardType={rewardType}
            categoryCounts={filterCounts.categories}
            rewardTypeCounts={filterCounts.rewardTypes}
            search={search}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>
      ) : null}

      <div className="@container/page flex min-w-0 flex-1 flex-col gap-6">
        <MarketplaceListToolbar
          variant="external"
          basePath={basePath}
          activeCategory={fixedCategory}
          categoryCounts={filterCounts?.categories ?? []}
          rewardTypeCounts={filterCounts?.rewardTypes ?? []}
        />

        {!programs ? (
          <MarketplaceProgramGridSkeleton />
        ) : programs.length > 0 ? (
          <MarketplaceProgramGrid
            programs={programs}
            showStatus={false}
            className={cn(isValidating && "opacity-50")}
          />
        ) : (
          <MarketplaceProgramGridEmpty />
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              const queryParams = new URLSearchParams();

              if (rewardType) queryParams.set("rewardType", rewardType);
              if (search) queryParams.set("search", search);
              if (sortBy !== "popularity") queryParams.set("sortBy", sortBy);
              if (sortOrder !== "desc") queryParams.set("sortOrder", sortOrder);
              if (pageNumber > 1) queryParams.set("page", String(pageNumber));

              const query = queryParams.toString();

              return (
                <Link
                  key={pageNumber}
                  href={`${basePath}${query ? `?${query}` : ""}`}
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
  );
}
