import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { useFraudGroupCount } from "@/lib/swr/use-fraud-groups-count";
import usePartners from "@/lib/swr/use-partners";
import { EnrolledPartnerProps, FraudGroupCountByType } from "@/lib/types";
import { fraudGroupCountQuerySchema } from "@/lib/zod/schemas/fraud";
import { useRouterStuff } from "@dub/ui";
import { ShieldKeyhole, Users } from "@dub/ui/icons";
import { nFormatter, OG_AVATAR_URL } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { z } from "zod";

export function useFraudGroupFilters({
  status,
}: z.infer<typeof fraudGroupCountQuerySchema>) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const { searchParamsObj, queryParams } = useRouterStuff();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { partners } = usePartnerFilterOptions(
    selectedFilter === "partnerId" ? debouncedSearch : "",
  );

  const { fraudGroupCount } = useFraudGroupCount<FraudGroupCountByType[]>({
    query: {
      status,
      groupBy: "type",
    },
  });

  const filters = useMemo(
    () => [
      {
        key: "type",
        icon: ShieldKeyhole,
        label: "Reason",
        options: fraudGroupCount
          ? fraudGroupCount.map(({ type, _count }) => ({
              label: FRAUD_RULES_BY_TYPE[type].name,
              value: type,
              right: nFormatter(_count, { full: true }),
            }))
          : null,
      },
      {
        key: "partnerId",
        icon: Users,
        label: "Partner",
        shouldFilter: false,
        options:
          partners?.map(({ id, name, image }) => {
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
            };
          }) ?? null,
      },
    ],
    [partners, fraudGroupCount],
  );

  const activeFilters = useMemo(() => {
    const { type, partnerId } = searchParamsObj;

    return [
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
        scroll: false,
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string, _value?: any) =>
      queryParams({
        del: [key, "page"],
        scroll: false,
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["type", "partnerId", "page"],
        scroll: false,
      }),
    [queryParams],
  );

  const isFiltered = activeFilters.length > 0;

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
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
