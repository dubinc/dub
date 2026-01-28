import usePartners from "@/lib/swr/use-partners";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import {
  partnerReferralsCountByPartnerIdSchema,
  partnerReferralsCountByStatusSchema,
} from "@/lib/zod/schemas/referrals";
import { CircleDotted, useRouterStuff } from "@dub/ui";
import { Users } from "@dub/ui/icons";
import { cn, nFormatter, OG_AVATAR_URL } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import * as z from "zod/v4";
import { useProgramReferralsCount } from "../../lib/swr/use-program-referrals-count";
import { ReferralStatusBadges } from "./referral-status-badges";

export function useProgramReferralsFilters(
  extraSearchParams: Record<string, string>,
) {
  const [search, setSearch] = useState("");
  const { id: workspaceId } = useWorkspace();
  const [debouncedSearch] = useDebounce(search, 500);
  const { searchParamsObj, queryParams } = useRouterStuff();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { partners } = usePartnerFilterOptions(
    selectedFilter === "partnerId" ? debouncedSearch : "",
  );

  const { data: statusCount } = useProgramReferralsCount<
    z.infer<typeof partnerReferralsCountByStatusSchema>[] | undefined
  >({
    query: {
      groupBy: "status",
    },
  });

  const { data: partnersCount } = useProgramReferralsCount<
    z.infer<typeof partnerReferralsCountByPartnerIdSchema>[] | undefined
  >({
    query: {
      groupBy: "partnerId",
    },
  });

  const partnersCountMap = useMemo(
    () => new Map(partnersCount?.map((p) => [p.partnerId, p._count]) ?? []),
    [partnersCount],
  );

  const filters = useMemo(
    () => [
      {
        key: "partnerId",
        icon: Users,
        label: "Partner",
        shouldFilter: false,
        options:
          partners?.map(({ id, name, image }) => {
            const count = partnersCountMap.get(id);

            return {
              value: id,
              label: name,
              icon: (
                <img
                  src={image || `${OG_AVATAR_URL}${id}`}
                  alt={`${name} image`}
                  className="size-4 rounded-full"
                />
              ),
              ...(count !== undefined && {
                right: nFormatter(count, { full: true }),
              }),
            };
          }) ?? null,
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          statusCount?.map(({ status, _count }) => {
            const badge = ReferralStatusBadges[status];
            const Icon = badge.icon;

            return {
              value: status,
              label: badge.label,
              icon: (
                <Icon
                  className={cn(badge.className, "size-4 bg-transparent")}
                />
              ),
              right: nFormatter(_count, { full: true }),
            };
          }) ?? [],
        meta: {
          filterParams: ({ getValue }) => ({
            status: getValue(),
          }),
        },
      },
    ],
    [partners, statusCount, partnersCount],
  );

  const activeFilters = useMemo(() => {
    const { partnerId, status } = searchParamsObj;

    return [
      ...(partnerId ? [{ key: "partnerId", value: partnerId }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
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
        del: ["partnerId", "status", "search"],
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
    [activeFilters, workspaceId, extraSearchParams, searchParamsObj.search],
  );

  const isFiltered = useMemo(
    () => activeFilters.length > 0 || searchParamsObj.search,
    [activeFilters, searchParamsObj.search],
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    isFiltered,
    setSearch,
    setSelectedFilter,
  };
}

function usePartnerFilterOptions(search: string) {
  const { searchParamsObj } = useRouterStuff();

  const { partners, loading: partnersLoading } = usePartners({
    query: { search },
  });

  const { partners: selectedPartners } = usePartners({
    query: {
      partnerIds: searchParamsObj.partnerId
        ? [searchParamsObj.partnerId]
        : undefined,
    },
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

  return { partners: result };
}
