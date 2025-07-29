import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { FRAUD_EVENT_TYPES } from "@/lib/zod/schemas/fraud-events";
import { FraudEventStatusBadges } from "@/ui/partners/fraud-event-status-badges";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, Tag } from "@dub/ui/icons";
import { cn, nFormatter } from "@dub/utils";
import { useMemo } from "react";

interface GroupByStatus {
  status: string;
  count: number;
}

interface GroupByType {
  type: string;
  count: number;
}

export function useFraudEventFilters(
  extraSearchParams: Record<string, string>,
) {
  const { id: workspaceId } = useWorkspace();
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { fraudEventsCount: statusCount } = useFraudEventsCount<
    GroupByStatus[] | undefined
  >({
    groupBy: "status",
  });

  const { fraudEventsCount: typeCount } = useFraudEventsCount<
    GroupByType[] | undefined
  >({
    groupBy: "type",
  });

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          statusCount?.map(({ status, count }) => {
            const badge = FraudEventStatusBadges[status];
            const Icon = badge.icon;

            return {
              value: status,
              label: badge.label,
              icon: (
                <Icon
                  className={cn(badge.className, "size-4 bg-transparent")}
                />
              ),
              right: nFormatter(count || 0, { full: true }),
            };
          }) ?? [],
      },

      {
        key: "type",
        icon: Tag,
        label: "Type",
        options:
          typeCount?.map(({ type, count }) => {
            const badge = FRAUD_EVENT_TYPES[type];

            return {
              value: type,
              label: badge.label,
              right: nFormatter(count || 0, { full: true }),
            };
          }) ?? [],
      },
    ],
    [statusCount, typeCount],
  );

  const activeFilters = useMemo(() => {
    const { status, type } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(type ? [{ key: "type", value: type }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
    });

  const onRemove = (key: string, value: any) =>
    queryParams({
      del: [key, "page"],
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["status", "type", "search"],
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
