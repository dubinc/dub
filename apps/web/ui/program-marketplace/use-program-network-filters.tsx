import {
  PROGRAM_CATEGORIES,
  PROGRAM_CATEGORIES_MAP,
} from "@/lib/network/program-categories";
import useNetworkProgramsCount from "@/lib/swr/use-network-programs-count";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, Gift, Suitcase } from "@dub/ui/icons";
import { nFormatter } from "@dub/utils";
import { Category } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  MARKETPLACE_ENROLLMENT_STATUSES,
  MARKETPLACE_REWARD_TYPES,
} from "./utils/constants";
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
            right: rewardTypesCount
              ? nFormatter(
                  rewardTypesCount.find(({ type }) => type === key)?._count ||
                    0,
                  { full: true },
                )
              : undefined,
          }),
        ),
      },
      {
        key: "category",
        icon: Suitcase,
        label: "Category",
        labelPlural: "categories",
        singleSelect: true,
        options: categoriesCount
          ? categoriesCount.map(({ category, _count }) => ({
              value: category,
              label:
                PROGRAM_CATEGORIES_MAP[category as Category]?.label ??
                category.replaceAll("_", " "),
              right: nFormatter(_count, { full: true }),
            }))
          : Array.from({ length: PROGRAM_CATEGORIES.length }).map(
              (_, index) => ({
                value: index,
                label: "",
                disabled: categoriesCount === undefined,
              }),
            ),
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        singleSelect: true,
        options: Object.entries(MARKETPLACE_ENROLLMENT_STATUSES).map(
          ([key, label]) => ({
            value: key,
            label,
            right: statusCount
              ? nFormatter(
                  statusCount.find(({ status }) =>
                    key === "null" ? status === null : status === key,
                  )?._count ?? 0,
                  { full: true },
                )
              : undefined,
          }),
        ),
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
    const preserved = getPreservedMarketplaceSearchParams(searchParamsObj);

    if (routeCategory) {
      router.replace(
        getMarketplaceAllHref({
          sortBy: preserved.sortBy,
          sortOrder: preserved.sortOrder,
        }),
      );
      return;
    }

    queryParams({
      del: ["rewardType", "category", "status", "search", "page"],
    });
  }, [queryParams, routeCategory, router, searchParamsObj]);

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
