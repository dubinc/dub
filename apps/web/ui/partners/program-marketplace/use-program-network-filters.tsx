import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import useNetworkProgramsCount from "@/lib/swr/use-network-programs-count";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, Gift, Suitcase } from "@dub/ui/icons";
import { capitalize, nFormatter } from "@dub/utils";
import { useCallback, useMemo } from "react";
import { ProgramNetworkStatusBadges } from "../../../app/(ee)/partners.dub.co/(dashboard)/programs/marketplace/program-status-badge";

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

export function useProgramNetworkFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();

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
    const { rewardType, category, status } = searchParamsObj;

    return [
      ...(rewardType ? [{ key: "rewardType", value: rewardType }] : []),
      ...(category ? [{ key: "category", value: category }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = useCallback(
    (key: string, value: string) =>
      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string, _value?: string) => {
      queryParams({
        del: [key, "page"],
      });
    },
    [queryParams],
  );

  const onClearFilters = useCallback(
    () =>
      queryParams({
        del: ["rewardType", "category", "status", "page"],
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["rewardType", "category", "status", "search", "page"],
      }),
    [queryParams],
  );

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
