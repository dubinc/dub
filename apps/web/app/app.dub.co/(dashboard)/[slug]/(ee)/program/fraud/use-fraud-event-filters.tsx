import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { FRAUD_EVENT_TYPES } from "@/lib/zod/schemas/fraud-events";
import { FraudEventStatusBadges } from "@/ui/partners/fraud-event-status-badges";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, Tag, Users } from "@dub/ui/icons";
import { cn, nFormatter, OG_AVATAR_URL } from "@dub/utils";
import { useCallback, useMemo } from "react";

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

  const { partners, partnersAsync } = usePartnerFilterOptions("");

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

      {
        key: "partnerId",
        icon: Users,
        label: "Partner",
        shouldFilter: !partnersAsync,
        options:
          partners?.map(({ id, name, image }) => {
            return {
              value: id,
              label: name,
              icon: (
                <img
                  src={image || `${OG_AVATAR_URL}${name}`}
                  alt={`${name} image`}
                  className="size-4 rounded-full"
                />
              ),
            };
          }) ?? null,
      },
    ],
    [statusCount, typeCount, partners, partnersAsync],
  );

  const activeFilters = useMemo(() => {
    const { status, type, partnerId } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(type ? [{ key: "type", value: type }] : []),
      ...(partnerId ? [{ key: "partnerId", value: partnerId }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) =>
      queryParams({
        del: [key, "page"],
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["status", "type", "partnerId"],
      }),
    [queryParams],
  );

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

function usePartnerFilterOptions(search: string) {
  const { searchParamsObj } = useRouterStuff();

  const { partnersCount } = usePartnersCount<number>({
    ignoreParams: true,
  });

  const partnersAsync = Boolean(
    partnersCount && partnersCount > 100, // Using a reasonable limit for partners
  );

  const { partners, loading: partnersLoading } = usePartners({
    query: { search: partnersAsync ? search : "" },
  });

  const { partners: selectedPartners } = usePartners({
    query: {
      partnerIds: searchParamsObj.partnerId
        ? [searchParamsObj.partnerId]
        : undefined,
    },
    enabled: partnersAsync,
  });

  const result = useMemo(() => {
    return partnersLoading ||
      // Consider partners loading if we can't find the currently filtered partner
      (searchParamsObj.partnerId &&
        ![...(selectedPartners ?? []), ...(partners ?? [])].some(
          (p) => p.id === searchParamsObj.partnerId,
        ))
      ? null
      : ([
          ...(partners ?? []),
          // Add selected partner to list if not already in partners
          ...(selectedPartners
            ?.filter((st) => !partners?.some((t) => t.id === st.id))
            ?.map((st) => ({ ...st, hideDuringSearch: true })) ?? []),
        ] as (EnrolledPartnerProps & { hideDuringSearch?: boolean })[]);
  }, [partnersLoading, partners, selectedPartners, searchParamsObj.partnerId]);

  return { partners: result, partnersAsync };
}
