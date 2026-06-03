import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import useNetworkProgramsCount from "@/lib/swr/use-network-programs-count";
import { Category } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, Gift, Suitcase } from "@dub/ui/icons";
import { capitalize, nFormatter } from "@dub/utils";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
} from "./get-marketplace-href";
import { ProgramNetworkStatusBadges } from "./program-status-badge";
import { getMarketplaceCategoryFromPathname } from "./utils/category-slug";

const REWARD_TYPES = {
  sale: {
    label: "Sale reward (CPS)",
  },
  lead: {
    label: "Lead reward (CPL)",
  },
  click: {
    label: "Click reward (CPC)",
  },
  discount: {
    label: "Dual-sided incentives",
  },
};

function getPreservedMarketplaceParams(
  searchParamsObj: Record<string, string | string[] | undefined>,
) {
  const { rewardType, search, sortBy, sortOrder } = searchParamsObj;

  return {
    rewardType: typeof rewardType === "string" ? rewardType : undefined,
    search: typeof search === "string" ? search : undefined,
    sortBy: typeof sortBy === "string" ? sortBy : undefined,
    sortOrder: typeof sortOrder === "string" ? sortOrder : undefined,
  };
}

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
        options: Object.entries(REWARD_TYPES).map(([key, { label }]) => ({
          value: key,
          label,
          right: nFormatter(
            rewardTypesCount?.find(({ type }) => type === key)?._count || 0,
            { full: true },
          ),
        })),
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
            const { label } = status
              ? ProgramNetworkStatusBadges[status]
              : {
                  label: "Not applied",
                };

            return {
              value: status ?? "null",
              label: label || capitalize(status),
              right: nFormatter(_count, { full: true }),
            };
          }) ?? null,
      },
    ],
    [categoriesCount, rewardTypesCount, statusCount],
  );

  const activeFilters = useMemo(() => {
    const { rewardType, category: categoryQuery, status } = searchParamsObj;
    const category = routeCategory ?? categoryQuery;

    return [
      ...(rewardType ? [{ key: "rewardType", value: rewardType }] : []),
      ...(category ? [{ key: "category", value: category }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
    ];
  }, [routeCategory, searchParamsObj]);

  const onSelect = useCallback(
    (key: string, value: string) => {
      if (key === "category") {
        router.push(
          getMarketplaceCategoryHref(
            value as Category,
            getPreservedMarketplaceParams(searchParamsObj),
          ),
        );
        return;
      }

      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
      });
    },
    [queryParams, router, searchParamsObj],
  );

  const onRemove = useCallback(
    (key: string, _value?: string) => {
      if (key === "category") {
        router.push(
          getMarketplaceAllHref(getPreservedMarketplaceParams(searchParamsObj)),
        );
        return;
      }

      queryParams({
        del: [key, "page"],
      });
    },
    [queryParams, router, searchParamsObj],
  );

  const onClearFilters = useCallback(() => {
    const preserved = getPreservedMarketplaceParams(searchParamsObj);

    if (routeCategory) {
      router.push(
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
      router.push(getMarketplaceAllHref());
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
