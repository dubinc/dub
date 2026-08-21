"use client";

import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { useRouterStuff } from "@dub/ui";
import { FilterBars } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Category } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { MarketplaceFilterControl } from "./marketplace-filter-control";
import { MarketplaceFilterSortSheet } from "./marketplace-filter-sort-sheet";
import ProgramSort from "./program-sort";
import { useProgramNetworkFilters } from "./use-program-network-filters";
import { usePublicMarketplaceFilters } from "./use-public-marketplace-filters";
import {
  getMarketplaceToolbarBadgeCount,
  type MarketplaceRewardType,
} from "./utils/constants";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryFromPathname,
} from "./utils/urls";

function MarketplaceListToolbarInternal() {
  const router = useRouter();
  const pathname = usePathname();
  const { searchParamsObj, queryParams } = useRouterStuff();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { filters, activeFilters, onSelect, onRemove, onClearFilters } =
    useProgramNetworkFilters();

  const sortBy =
    typeof searchParamsObj.sortBy === "string"
      ? searchParamsObj.sortBy
      : "popularity";
  const sortOrder =
    typeof searchParamsObj.sortOrder === "string"
      ? searchParamsObj.sortOrder
      : "desc";

  const badgeCount = getMarketplaceToolbarBadgeCount(
    activeFilters.length,
    sortBy,
    sortOrder,
  );

  const routeCategory = getMarketplaceCategoryFromPathname(pathname);

  const onClearAll = useCallback(() => {
    const search =
      typeof searchParamsObj.search === "string"
        ? searchParamsObj.search
        : undefined;

    if (routeCategory) {
      router.replace(getMarketplaceAllHref({ search }));
      return;
    }

    queryParams({
      del: ["rewardType", "status", "page", "sortBy", "sortOrder"],
    });
  }, [queryParams, routeCategory, router, searchParamsObj]);

  const onSortChange = useCallback(
    (nextSortBy: string, nextSortOrder: string) => {
      queryParams({
        set: { sortBy: nextSortBy, sortOrder: nextSortOrder },
        del: "page",
      });
    },
    [queryParams],
  );

  return (
    <>
      <MarketplaceFilterSortSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        activeFilters={activeFilters}
        onSelect={onSelect}
        onRemove={onRemove}
        onClearAll={onClearAll}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        badgeCount={badgeCount}
      />
      <ToolbarLayout
        badgeCount={badgeCount}
        activeFilterCount={activeFilters.length}
        onOpenSheet={() => setSheetOpen(true)}
        onClearFilters={onClearFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    </>
  );
}

function MarketplaceListToolbarExternal({
  basePath,
  activeCategory,
  categoryCounts,
  rewardTypeCounts,
}: {
  basePath: string;
  activeCategory?: Category;
  categoryCounts: { category: Category; count: number }[];
  rewardTypeCounts: {
    type: MarketplaceRewardType;
    count: number;
  }[];
}) {
  const { searchParamsObj } = useRouterStuff();
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onClearFilters,
    onSortChange,
  } = usePublicMarketplaceFilters({
    basePath,
    activeCategory,
    categoryCounts,
    rewardTypeCounts,
  });

  const sortBy =
    typeof searchParamsObj.sortBy === "string"
      ? searchParamsObj.sortBy
      : "popularity";
  const sortOrder =
    typeof searchParamsObj.sortOrder === "string"
      ? searchParamsObj.sortOrder
      : "desc";

  const badgeCount = getMarketplaceToolbarBadgeCount(
    activeFilters.length,
    sortBy,
    sortOrder,
  );

  const onClearAll = useCallback(() => {
    onClearFilters();
  }, [onClearFilters]);

  return (
    <>
      <MarketplaceFilterSortSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        activeFilters={activeFilters}
        onSelect={onSelect}
        onRemove={onRemove}
        onClearAll={onClearAll}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        badgeCount={badgeCount}
      />
      <ToolbarLayout
        badgeCount={badgeCount}
        activeFilterCount={activeFilters.length}
        onOpenSheet={() => setSheetOpen(true)}
        onClearFilters={onClearFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    </>
  );
}

function ToolbarLayout({
  badgeCount,
  activeFilterCount,
  onOpenSheet,
  onClearFilters,
}: {
  badgeCount: number;
  activeFilterCount: number;
  onOpenSheet: () => void;
  onClearFilters: () => void;
  sortBy: string;
  sortOrder: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 lg:gap-6",
        "lg:flex lg:items-center lg:justify-between",
      )}
    >
      <button
        type="button"
        onClick={onOpenSheet}
        className={cn(
          "flex h-9 w-full min-w-0 items-center justify-center gap-2 rounded-lg border px-3 lg:hidden",
          "border-neutral-200 bg-white text-sm font-medium text-neutral-900",
          "transition-colors hover:bg-neutral-50",
        )}
      >
        <FilterBars className="size-4 shrink-0" />
        <span className="truncate">Filter and sort</span>
        {badgeCount > 0 ? (
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black text-[0.625rem] font-medium leading-none text-white">
            {badgeCount}
          </div>
        ) : null}
      </button>

      <div className="hidden items-center gap-4 lg:flex lg:gap-2">
        <MarketplaceFilterControl
          activeFilterCount={activeFilterCount}
          onClear={onClearFilters}
        />
        <ProgramSort forceDropdown />
      </div>

      <div className="min-w-0">
        <SearchBoxPersisted
          placeholder="Search..."
          inputClassName="h-9 w-full rounded-lg lg:w-[19rem]"
        />
      </div>
    </div>
  );
}

export function MarketplaceListToolbar(
  props:
    | { variant: "internal" }
    | {
        variant: "external";
        basePath: string;
        activeCategory?: Category;
        categoryCounts: { category: Category; count: number }[];
        rewardTypeCounts: {
          type: MarketplaceRewardType;
          count: number;
        }[];
      },
) {
  if (props.variant === "internal") {
    return <MarketplaceListToolbarInternal />;
  }

  return (
    <MarketplaceListToolbarExternal
      basePath={props.basePath}
      activeCategory={props.activeCategory}
      categoryCounts={props.categoryCounts}
      rewardTypeCounts={props.rewardTypeCounts}
    />
  );
}
