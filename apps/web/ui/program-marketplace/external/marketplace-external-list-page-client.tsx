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
import {
  MarketplaceExternalFilterSidebar,
  MarketplaceExternalFilterSidebarSkeleton,
} from "./marketplace-external-filters";

const PAGE_SIZE = EXTERNAL_MARKETPLACE_PAGE_SIZE;

type FilterCounts = {
  categories: { category: Category; count: number }[];
  rewardTypes: {
    type: MarketplaceRewardType;
    count: number;
  }[];
};

type ProgramCounts = FilterCounts & { total: number };

const PARAM_KEYS = ["rewardType", "search", "sortBy", "sortOrder", "page"];

function pickString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function MarketplaceExternalListPageClient({
  basePath,
  fixedCategory,
  initialPrograms,
  initialCounts,
}: {
  basePath: string;
  fixedCategory?: Category;
  initialPrograms: NetworkProgramProps[];
  initialCounts: ProgramCounts;
}) {
  const router = useRouter();
  const { getQueryString, searchParamsObj } = useRouterStuff();

  const hasParams = PARAM_KEYS.some((key) => {
    const value = searchParamsObj[key];
    return typeof value === "string" && value !== "";
  });

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

  const shouldFetch = parsed.success && hasParams;

  const queryString = shouldFetch
    ? getQueryString({
        ...(fixedCategory ? { category: fixedCategory } : {}),
        pageSize: String(PAGE_SIZE),
      })
    : null;

  const { data: fetchedPrograms, isValidating } = useSWR<NetworkProgramProps[]>(
    queryString ? `/api/marketplace/programs${queryString}` : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const { data: fetchedCounts } = useSWR<ProgramCounts>(
    queryString ? `/api/marketplace/programs/counts${queryString}` : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  if (!parsed.success) {
    return <MarketplaceProgramGridSkeleton />;
  }

  const { rewardType, search, sortBy, sortOrder, page = 1 } = parsed.data;

  const programs = hasParams ? fetchedPrograms : initialPrograms;
  const isLoadingPrograms = hasParams && !fetchedPrograms;

  const counts = (hasParams ? fetchedCounts : initialCounts) ?? initialCounts;
  const isLoadingCounts = hasParams && !fetchedCounts;

  const totalPages = Math.max(1, Math.ceil(counts.total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <div className="hidden shrink-0 lg:block">
        {isLoadingCounts ? (
          <MarketplaceExternalFilterSidebarSkeleton />
        ) : (
          <MarketplaceExternalFilterSidebar
            basePath={basePath}
            activeCategory={fixedCategory}
            activeRewardType={rewardType}
            categoryCounts={counts.categories}
            rewardTypeCounts={counts.rewardTypes}
            search={search}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        )}
      </div>

      <div className="@container/page flex min-w-0 flex-1 flex-col gap-6">
        <MarketplaceListToolbar
          variant="external"
          basePath={basePath}
          activeCategory={fixedCategory}
          categoryCounts={counts.categories}
          rewardTypeCounts={counts.rewardTypes}
        />

        {isLoadingPrograms || !programs ? (
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
