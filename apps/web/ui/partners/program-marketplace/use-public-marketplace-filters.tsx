"use client";

import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import { Category } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { Gift, Suitcase } from "@dub/ui/icons";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { getMarketplaceAllHref } from "./get-marketplace-href";
import {
  buildExternalMarketplaceFilterHref,
  type ExternalMarketplaceRewardType,
} from "./utils/build-external-marketplace-filter-href";

const REWARD_TYPES = {
  sale: "Sale reward (CPS)",
  lead: "Lead reward (CPL)",
  click: "Click reward (CPC)",
  discount: "Dual-sided incentives",
} as const;

export function usePublicMarketplaceFilters({
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
  const router = useRouter();
  const { searchParamsObj } = useRouterStuff();

  const search =
    typeof searchParamsObj.search === "string"
      ? searchParamsObj.search
      : undefined;
  const sortBy =
    typeof searchParamsObj.sortBy === "string"
      ? searchParamsObj.sortBy
      : undefined;
  const sortOrder =
    typeof searchParamsObj.sortOrder === "string"
      ? searchParamsObj.sortOrder
      : undefined;
  const activeRewardType = searchParamsObj.rewardType as
    | ExternalMarketplaceRewardType
    | undefined;

  const filters = useMemo(
    () => [
      {
        key: "rewardType",
        icon: Gift,
        label: "Reward type",
        singleSelect: true,
        options: rewardTypeCounts.map(({ type, count }) => ({
          value: type,
          label: REWARD_TYPES[type],
          right: String(count),
        })),
      },
      {
        key: "category",
        icon: Suitcase,
        label: "Category",
        singleSelect: true,
        options: categoryCounts.map(({ category, count }) => ({
          value: category,
          label:
            PROGRAM_CATEGORIES_MAP[category]?.label ??
            category.replaceAll("_", " "),
          right: String(count),
        })),
      },
    ],
    [categoryCounts, rewardTypeCounts],
  );

  const activeFilters = useMemo(() => {
    return [
      ...(activeRewardType
        ? [{ key: "rewardType", value: activeRewardType }]
        : []),
      ...(activeCategory ? [{ key: "category", value: activeCategory }] : []),
    ];
  }, [activeCategory, activeRewardType]);

  const buildHref = useCallback(
    (params: {
      category?: Category | null;
      rewardType?: ExternalMarketplaceRewardType | null;
    }) =>
      buildExternalMarketplaceFilterHref({
        basePath,
        activeCategory,
        activeRewardType,
        search,
        sortBy,
        sortOrder,
        ...params,
      }),
    [activeCategory, activeRewardType, basePath, search, sortBy, sortOrder],
  );

  const onSelect = useCallback(
    (key: string, value: string) => {
      if (key === "category") {
        router.push(buildHref({ category: value as Category }));
        return;
      }

      if (key === "rewardType") {
        router.push(
          buildHref({
            rewardType: value as ExternalMarketplaceRewardType,
          }),
        );
      }
    },
    [activeRewardType, buildHref, router],
  );

  const onRemove = useCallback(
    (key: string) => {
      if (key === "category") {
        router.push(buildHref({ category: null }));
        return;
      }

      if (key === "rewardType") {
        router.push(buildHref({ rewardType: null }));
      }
    },
    [buildHref, router],
  );

  const onClearFilters = useCallback(() => {
    router.push(
      getMarketplaceAllHref({
        search,
      }),
    );
  }, [router, search]);

  const onSortChange = useCallback(
    (nextSortBy: string, nextSortOrder: string) => {
      router.push(
        buildExternalMarketplaceFilterHref({
          basePath,
          activeCategory,
          activeRewardType,
          search,
          sortBy: nextSortBy,
          sortOrder: nextSortOrder,
          category: activeCategory,
          rewardType: activeRewardType,
        }),
      );
    },
    [activeCategory, activeRewardType, basePath, router, search],
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onClearFilters,
    onSortChange,
  };
}
