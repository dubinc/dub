import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import useNetworkProgramsCount from "@/lib/swr/use-network-programs-count";
import { Category } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, Gift, Suitcase } from "@dub/ui/icons";
import { capitalize, nFormatter } from "@dub/utils";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { MARKETPLACE_REWARD_TYPES } from "./constants";
import { ProgramNetworkStatusBadges } from "./program-status-badge";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryFromPathname,
  getMarketplaceCategoryHref,
  getPreservedMarketplaceSearchParams,
} from "./utils/urls";

export function useProgramNetworkFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const { searchParamsObj, queryParams } = useRouterStuff();

  const routeCategory = getMarketplaceCategoryFromPathname(pathname);

  const { data: categoriesCount } = useNetworkProgramsCount<
    | {
        category: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      groupBy: "category",
    },
    excludeParams: ["category"],
  });

  const { data: rewardTypesCount } = useNetworkProgramsCount<
    | {
        type: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      groupBy: "rewardType",
    },
    excludeParams: ["rewardType"],
  });

  const { data: statusCount } = useNetworkProgramsCount<
    | {
        status: string | null;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      groupBy: "status",
    },
    excludeParams: ["status"],
  });

  const filters = useMemo(
    () => [
      {
        key: "rewardType",
        icon: Gift,
        label: "Reward type",
        singleSelect: true,
        options: Object.entries(MARKETPLACE_REWARD_TYPES).map(
          ([key, label]) => ({
            value: key,
            label,
            right: nFormatter(
              rewardTypesCount?.find(({ type }) => type === key)?._count || 0,
              { full: true },
            ),
          }),
        ),
      },
      {
        key: "category",
        icon: Suitcase,
        label: "Category",
        labelPlural: "categories",
        singleSelect: true,
        getOptionLabel: (value) =>
          PROGRAM_CATEGORIES_MAP[value]?.label || value.replaceAll("_", " "),
        options:
          categoriesCount?.map(({ category, _count }) => ({
            value: category,
            label: category.replaceAll("_", " "),
            right: nFormatter(_count, { full: true }),
          })) ?? [],
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        singleSelect: true,
        options:
          statusCount?.map(({ status, _count }) => {
            const label = status
              ? ProgramNetworkStatusBadges[
                  status as keyof typeof ProgramNetworkStatusBadges
                ]?.label ?? capitalize(status)
              : "Not applied";

            return {
              value: status ?? "null",
              label,
              right: nFormatter(_count, { full: true }),
            };
          }) ?? null,
      },
    ],
    [categoriesCount, rewardTypesCount, statusCount],
  );

  const activeFilters = useMemo(() => {
    const { rewardType, status } = searchParamsObj;

    return [
      ...(rewardType ? [{ key: "rewardType", value: rewardType }] : []),
      ...(routeCategory ? [{ key: "category", value: routeCategory }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
    ];
  }, [routeCategory, searchParamsObj]);

  const setCategoryFilter = useCallback(
    (category: Category | null) => {
      const preserved = getPreservedMarketplaceSearchParams(searchParamsObj);

      router.replace(
        category
          ? getMarketplaceCategoryHref(category, preserved)
          : getMarketplaceAllHref(preserved),
      );
    },
    [router, searchParamsObj],
  );

  const onSelect = useCallback(
    (key: string, value: string) => {
      if (key === "category") {
        setCategoryFilter(value as Category);
        return;
      }

      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
      });
    },
    [queryParams, setCategoryFilter],
  );

  const onRemove = useCallback(
    (key: string, _value?: string) => {
      if (key === "category") {
        setCategoryFilter(null);
        return;
      }

      queryParams({
        del: [key, "page"],
      });
    },
    [queryParams, setCategoryFilter],
  );

  const onClearFilters = useCallback(() => {
    const preserved = getPreservedMarketplaceSearchParams(searchParamsObj);

    if (routeCategory) {
      router.replace(
        getMarketplaceAllHref({
          search: preserved.search,
          sortBy: preserved.sortBy,
          sortOrder: preserved.sortOrder,
        }),
      );
      return;
    }

    queryParams({
      del: ["rewardType", "category", "status", "page"],
    });
  }, [queryParams, routeCategory, router, searchParamsObj]);

  const onRemoveAll = useCallback(() => {
    if (routeCategory) {
      router.replace(getMarketplaceAllHref());
      return;
    }

    queryParams({
      del: ["rewardType", "category", "status", "search", "page"],
    });
  }, [queryParams, routeCategory, router]);

  const isFiltered = Boolean(
    activeFilters.length > 0 || searchParamsObj.search,
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onClearFilters,
    onRemoveAll,
    isFiltered,
  };
}
