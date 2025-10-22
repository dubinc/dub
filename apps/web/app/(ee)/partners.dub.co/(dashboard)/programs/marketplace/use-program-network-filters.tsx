import { categoriesMap } from "@/lib/partners/categories";
import useNetworkProgramsCount from "@/lib/swr/use-network-programs-count";
import { useRouterStuff } from "@dub/ui";
import { Suitcase } from "@dub/ui/icons";
import { nFormatter } from "@dub/utils";
import { useCallback, useMemo } from "react";

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

  const filters = useMemo(
    () => [
      {
        key: "category",
        icon: Suitcase,
        label: "Industry",
        getOptionIcon: (value) => {
          const Icon = categoriesMap[value]?.icon || Suitcase;
          return <Icon className="size-4" />;
        },
        getOptionLabel: (value) =>
          categoriesMap[value]?.label || value.replace("_", " "),
        options:
          categoriesCount?.map(({ category, _count }) => ({
            value: category,
            label: category,
            right: nFormatter(_count, { full: true }),
          })) ?? [],
      },
    ],
    [categoriesCount],
  );

  const multiFilters = useMemo(() => ({}), []) as Record<string, string[]>;

  const activeFilters = useMemo(() => {
    const { category } = searchParamsObj;

    return [
      ...Object.entries(multiFilters)
        .map(([key, value]) => ({ key, value }))
        .filter(({ value }) => value.length > 0),

      ...(category ? [{ key: "category", value: category }] : []),
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
        del: ["category", "starred"],
      }),
    [queryParams],
  );

  const isFiltered = activeFilters.length > 0 || searchParamsObj.search;

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  };
}
