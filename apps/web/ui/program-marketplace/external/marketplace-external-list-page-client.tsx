"use client";

import { EXTERNAL_MARKETPLACE_PAGE_SIZE } from "@/lib/marketplace/parse-public-marketplace-query";
import { NetworkProgramProps } from "@/lib/types";
import { getPublicNetworkProgramsQuerySchema } from "@/lib/zod/schemas/program-network";
import { useRouterStuff } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { Category } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";
import * as z from "zod/v4";
import { MarketplaceListToolbar } from "../marketplace-list-toolbar";
import {
  MarketplaceProgramGrid,
  MarketplaceProgramGridEmpty,
  MarketplaceProgramGridSkeleton,
} from "../marketplace-program-grid";
import { type MarketplaceRewardType } from "../utils/constants";
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

type ParsedQuery = z.infer<typeof getPublicNetworkProgramsQuerySchema>;

type QueryState = {
  hasParams: boolean;
  queryString: string | null;
  data: ParsedQuery;
};

// query params that switch the page from its server-rendered default into a
// client-fetched (SWR) view; `category` is part of the static route, not a param
const PARAM_KEYS = ["rewardType", "search", "sortBy", "sortOrder", "page"];

function pickString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

type SharedProps = {
  basePath: string;
  fixedCategory?: Category;
  initialCounts: ProgramCounts;
  defaultGrid: ReactNode;
  defaultSidebar: ReactNode;
};

export function MarketplaceExternalListPageClient({
  basePath,
  fixedCategory,
  initialCounts,
  defaultGrid,
  defaultSidebar,
}: SharedProps) {
  const [query, setQuery] = useState<QueryState | null>(null);

  const hasParams = query?.hasParams ?? false;
  const queryString = query?.queryString ?? null;

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

  const rewardType = query?.data.rewardType;
  const search = query?.data.search;
  const sortBy = query?.data.sortBy;
  const sortOrder = query?.data.sortOrder;
  const page = query?.data.page ?? 1;

  const counts = (hasParams ? fetchedCounts : initialCounts) ?? initialCounts;
  const isLoadingCounts = hasParams && !fetchedCounts;
  const totalPages = Math.max(1, Math.ceil(counts.total / PAGE_SIZE));

  const sidebar = !hasParams ? (
    defaultSidebar
  ) : isLoadingCounts ? (
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
  );

  const grid = !hasParams ? (
    defaultGrid
  ) : !fetchedPrograms ? (
    <MarketplaceProgramGridSkeleton />
  ) : fetchedPrograms.length > 0 ? (
    <MarketplaceProgramGrid
      programs={fetchedPrograms}
      showStatus={false}
      className={cn(isValidating && "opacity-50")}
    />
  ) : (
    <MarketplaceProgramGridEmpty />
  );

  return (
    <>
      <Suspense fallback={null}>
        <MarketplaceParamSync
          basePath={basePath}
          fixedCategory={fixedCategory}
          onChange={setQuery}
        />
      </Suspense>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="hidden shrink-0 lg:block">{sidebar}</div>
        <div className="@container/page flex min-w-0 flex-1 flex-col gap-6">
          <Suspense fallback={<MarketplaceListToolbarSkeleton />}>
            <MarketplaceListToolbar
              variant="external"
              basePath={basePath}
              activeCategory={fixedCategory}
              categoryCounts={counts.categories}
              rewardTypeCounts={counts.rewardTypes}
            />
          </Suspense>

          {grid}

          <MarketplacePagination
            basePath={basePath}
            totalPages={totalPages}
            page={page}
            rewardType={rewardType}
            search={search}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>
      </div>
    </>
  );
}

function MarketplaceParamSync({
  basePath,
  fixedCategory,
  onChange,
}: {
  basePath: string;
  fixedCategory?: Category;
  onChange: Dispatch<SetStateAction<QueryState | null>>;
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

  const queryString =
    parsed.success && hasParams
      ? getQueryString({
          ...(fixedCategory ? { category: fixedCategory } : {}),
          pageSize: String(PAGE_SIZE),
        })
      : null;

  useEffect(() => {
    if (!parsed.success) {
      router.replace(basePath);
      return;
    }

    onChange({ hasParams, queryString, data: parsed.data });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, hasParams, queryString, parsed.success, router]);

  return null;
}

function MarketplacePagination({
  basePath,
  totalPages,
  page,
  rewardType,
  search,
  sortBy,
  sortOrder,
}: {
  basePath: string;
  totalPages: number;
  page: number;
  rewardType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalPages }, (_, index) => {
        const pageNumber = index + 1;
        const queryParams = new URLSearchParams();

        if (rewardType) queryParams.set("rewardType", rewardType);
        if (search) queryParams.set("search", search);
        if (sortBy && sortBy !== "popularity")
          queryParams.set("sortBy", sortBy);
        if (sortOrder && sortOrder !== "desc")
          queryParams.set("sortOrder", sortOrder);
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
  );
}

function MarketplaceListToolbarSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:flex lg:items-center lg:justify-between lg:gap-6">
      <div className="h-9 w-full animate-pulse rounded-lg bg-neutral-100 lg:hidden" />
      <div className="hidden h-9 w-44 animate-pulse rounded-lg bg-neutral-100 lg:block" />
      <div className="h-9 w-full animate-pulse rounded-lg bg-neutral-100 lg:w-[19rem]" />
    </div>
  );
}
