import { PROGRAM_CATEGORIES_MAP } from "@/lib/network/program-categories";
import useNetworkProgramsCount from "@/lib/swr/use-network-programs-count";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, Gift, Suitcase } from "@dub/ui/icons";
import { capitalize, cn, nFormatter } from "@dub/utils";
import { useCallback, useMemo } from "react";
import { ProgramNetworkStatusBadges } from "./program-status-badge";

const REWARD_TYPES = {
  sale: {
    icon: REWARD_EVENTS.sale.icon,
    label: "Sale reward (CPS)",
  },
  lead: {
    icon: REWARD_EVENTS.lead.icon,
    label: "Lead reward (CPL)",
  },
  click: {
    icon: REWARD_EVENTS.click.icon,
    label: "Click reward (CPC)",
  },
  discount: {
    icon: Gift,
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
        key: "category",
        icon: Suitcase,
        label: "Category",
        getOptionIcon: (value) => {
          const Icon = PROGRAM_CATEGORIES_MAP[value]?.icon || Suitcase;
          return <Icon className="size-4" />;
        },
        getOptionLabel: (value) =>
          PROGRAM_CATEGORIES_MAP[value]?.label || value.replace("_", " "),
        options:
          categoriesCount?.map(({ category, _count }) => ({
            value: category,
            label: category,
            right: nFormatter(_count, { full: true }),
          })) ?? [],
      },
      {
        key: "rewardType",
        multiple: true,
        icon: Gift,
        label: "Reward type",
        options: Object.entries(REWARD_TYPES).map(
          ([key, { label, icon: Icon }]) => ({
            value: key,
            label,
            icon: <Icon className="size-4" />,
            right: nFormatter(
              rewardTypesCount?.find(({ type }) => type === key)?._count || 0,
              { full: true },
            ),
          }),
        ),
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          statusCount?.map(({ status, _count }) => {
            const {
              label,
              icon: Icon,
              className,
            } = status
              ? ProgramNetworkStatusBadges[status]
              : {
                  label: "Not applied",
                  icon: CircleDotted,
                  className: "text-neutral-500",
                };
            return {
              value: status ?? "null",
              label: label || capitalize(status),
              icon: (
                <Icon className={cn("size-4", className, "bg-transparent")} />
              ),
              right: nFormatter(_count, { full: true }),
            };
          }) ?? null,
      },
    ],
    [categoriesCount, rewardTypesCount, statusCount],
  );

  const multiFilters = useMemo(
    () => ({
      rewardType: searchParamsObj.rewardType?.split(",").filter(Boolean) ?? [],
    }),
    [searchParamsObj],
  ) as Record<string, string[]>;

  const activeFilters = useMemo(() => {
    const { category, status } = searchParamsObj;

    return [
      ...Object.entries(multiFilters)
        .map(([key, value]) => ({ key, value }))
        .filter(({ value }) => value.length > 0),

      ...(category ? [{ key: "category", value: category }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
    ];
  }, [searchParamsObj, multiFilters]);

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: Object.keys(multiFilters).includes(key)
          ? {
              [key]: multiFilters[key].concat(value).join(","),
            }
          : {
              [key]: value,
            },
        del: "page",
      }),
    [queryParams, multiFilters],
  );

  const onRemove = useCallback(
    (key: string, value: any) => {
      if (
        Object.keys(multiFilters).includes(key) &&
        !(multiFilters[key].length === 1 && multiFilters[key][0] === value)
      ) {
        queryParams({
          set: {
            [key]: multiFilters[key].filter((id) => id !== value).join(","),
          },
          del: "page",
        });
      } else {
        queryParams({
          del: [key, "page"],
        });
      }
    },
    [queryParams, multiFilters],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: [...Object.keys(multiFilters), "category", "status", "search"],
      }),
    [queryParams, multiFilters],
  );

  const isFiltered = Boolean(
    activeFilters.length > 0 || searchParamsObj.search,
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  };
}
