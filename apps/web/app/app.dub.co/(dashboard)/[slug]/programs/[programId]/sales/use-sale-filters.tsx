import useSalesCount from "@/lib/swr/use-sales-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { CircleDotted, useRouterStuff } from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import { useMemo } from "react";
import { SaleStatusBadges } from "./sale-table";

export function useSaleFilters(extraSearchParams: Record<string, string>) {
  const { salesCount } = useSalesCount();
  const { id: workspaceId } = useWorkspace();
  const { searchParamsObj, queryParams } = useRouterStuff();

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(SaleStatusBadges).map(([value, { label }]) => {
          const Icon = SaleStatusBadges[value].icon;
          return {
            value,
            label,
            icon: (
              <Icon
                className={cn(
                  SaleStatusBadges[value].className,
                  "size-4 bg-transparent",
                )}
              />
            ),
            right: nFormatter(salesCount?.[value] || 0, { full: true }),
          };
        }),
      },
    ],
    [salesCount],
  );

  const activeFilters = useMemo(() => {
    const { status } = searchParamsObj;

    return [...(status ? [{ key: "status", value: status }] : [])];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
    });

  const onRemove = (key: string) =>
    queryParams({
      del: [key, "page"],
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["status"],
    });

  const searchQuery = useMemo(
    () =>
      new URLSearchParams({
        ...Object.fromEntries(
          activeFilters.map(({ key, value }) => [key, value]),
        ),
        ...(searchParamsObj.search && { search: searchParamsObj.search }),
        workspaceId: workspaceId || "",
        ...extraSearchParams,
      }).toString(),
    [activeFilters, workspaceId, extraSearchParams],
  );

  const isFiltered = activeFilters.length > 0 || searchParamsObj.search;

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    isFiltered,
  };
}
