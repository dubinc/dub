import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import usePayoutsCount from "@/lib/swr/use-payouts-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, PayoutsCount } from "@/lib/types";
import { PARTNERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partners";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, Users } from "@dub/ui/icons";
import { cn, DICEBEAR_AVATAR_URL, nFormatter } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

export function usePayoutFilters(extraSearchParams: Record<string, string>) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();

  const { payoutsCount } = usePayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { partners, partnersAsync } = usePartnerFilterOptions(
    selectedFilter === "partnerId" ? debouncedSearch : "",
  );

  const filters = useMemo(
    () => [
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
                  src={image || `${DICEBEAR_AVATAR_URL}${name}`}
                  alt={`${name} image`}
                  className="size-4 rounded-full"
                />
              ),
            };
          }) ?? null,
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(PayoutStatusBadges).map(
          ([value, { label }]) => {
            const Icon = PayoutStatusBadges[value].icon;
            const count = payoutsCount?.find((p) => p.status === value)?.count;

            return {
              value,
              label,
              icon: (
                <Icon
                  className={cn(
                    PayoutStatusBadges[value].className,
                    "size-4 bg-transparent",
                  )}
                />
              ),
              right: nFormatter(count || 0, { full: true }),
            };
          },
        ),
      },
    ],
    [payoutsCount, partners, partnersAsync],
  );

  const activeFilters = useMemo(() => {
    const { status, partnerId } = searchParamsObj;
    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(partnerId ? [{ key: "partnerId", value: partnerId }] : []),
    ];
  }, [searchParamsObj.status, searchParamsObj.partnerId]);

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
        del: ["status", "search", "partnerId"],
      }),
    [queryParams],
  );

  const searchQuery = useMemo(
    () =>
      new URLSearchParams({
        ...Object.fromEntries(
          activeFilters.map(({ key, value }) => [key, value]),
        ),
        workspaceId: workspaceId || "",
        ...extraSearchParams,
      }).toString(),
    [activeFilters, workspaceId, extraSearchParams],
  );

  const isFiltered = useMemo(() => activeFilters.length > 0, [activeFilters]);

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

  const { partnersCount } = usePartnersCount<number>({
    ignoreParams: true,
  });

  const partnersAsync = Boolean(
    partnersCount && partnersCount > PARTNERS_MAX_PAGE_SIZE,
  );

  const { data: partners, loading: partnersLoading } = usePartners({
    query: { search: partnersAsync ? search : "" },
  });

  const { data: selectedPartners } = usePartners({
    query: {
      ids: searchParamsObj.partnerId ? [searchParamsObj.partnerId] : undefined,
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
        ] as (EnrolledPartnerProps & { hideDuringSearch?: boolean })[]) ?? null;
  }, [partnersLoading, partners, selectedPartners, searchParamsObj.partnerId]);

  return { partners: result, partnersAsync };
}
