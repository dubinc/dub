import useGroups from "@/lib/swr/use-groups";
import usePartners from "@/lib/swr/use-partners";
import { usePayoutsCount } from "@/lib/swr/use-payouts-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, InvoiceDollar, Users, Users6 } from "@dub/ui/icons";
import { cn, nFormatter, parseFilterValue } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

const MULTI_VALUE_FILTER_KEYS = ["groupId"] as const;

export function usePayoutFilters() {
  const { slug } = useWorkspace();
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { payoutsCount } = usePayoutsCount({
    groupBy: "status",
  });

  const { groups } = useGroups();

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { partners } = usePartnerFilterOptions(
    selectedFilter === "partnerId" ? debouncedSearch : "",
  );

  const filters = useMemo(
    () => [
      {
        key: "partnerId",
        icon: Users,
        label: "Partner",
        shouldFilter: false,
        options:
          partners?.map((partner) => {
            return {
              value: partner.id,
              label: partner.name,
              icon: <PartnerAvatar partner={partner} className="size-4" />,
            };
          }) ?? null,
      },
      {
        key: "groupId",
        icon: Users6,
        label: "Partner Group",
        options:
          groups?.map((group) => {
            return {
              value: group.id,
              label: group.name,
              icon: <GroupColorCircle group={group} />,
              permalink: `/${slug}/program/groups/${group.slug}/rewards`,
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
              ...(value !== "hold" && {
                right: nFormatter(count || 0, { full: true }),
              }),
            };
          },
        ),
      },
      {
        key: "invoiceId",
        icon: InvoiceDollar,
        label: "Invoice",
        options: [],
      },
    ],
    [payoutsCount, partners, groups, slug],
  );

  const activeFilters = useMemo(() => {
    const { status, partnerId, invoiceId } = searchParamsObj;

    const singleValueFilters = [
      ...(status ? [{ key: "status" as const, value: status }] : []),
      ...(partnerId ? [{ key: "partnerId" as const, value: partnerId }] : []),
      ...(invoiceId ? [{ key: "invoiceId" as const, value: invoiceId }] : []),
    ];

    const groupIdRaw = searchParamsObj.groupId;
    const parsedGroupId = groupIdRaw ? parseFilterValue(groupIdRaw) : null;
    const multiValueFilters = parsedGroupId
      ? [
          {
            key: "groupId" as const,
            operator: parsedGroupId.operator,
            values: parsedGroupId.values,
          },
        ]
      : [];

    return [...singleValueFilters, ...multiValueFilters];
  }, [
    searchParamsObj.status,
    searchParamsObj.partnerId,
    searchParamsObj.invoiceId,
    searchParamsObj.groupId,
  ]);

  const onSelect = useCallback(
    (key: string, value: string) => {
      if (
        MULTI_VALUE_FILTER_KEYS.includes(
          key as (typeof MULTI_VALUE_FILTER_KEYS)[number],
        )
      ) {
        const currentParam = searchParamsObj[key];
        if (!currentParam) {
          queryParams({ set: { [key]: value }, del: "page" });
          return;
        }
        const parsed = parseFilterValue(currentParam);
        if (parsed && !parsed.values.includes(value)) {
          const newValues = [...parsed.values, value];
          const newParam = parsed.operator.includes("NOT")
            ? `-${newValues.join(",")}`
            : newValues.join(",");
          queryParams({ set: { [key]: newParam }, del: "page" });
        }
        return;
      }

      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
      });
    },
    [searchParamsObj, queryParams],
  );

  const onRemove = useCallback(
    (key: string, value?: string) => {
      if (
        MULTI_VALUE_FILTER_KEYS.includes(
          key as (typeof MULTI_VALUE_FILTER_KEYS)[number],
        ) &&
        value
      ) {
        const currentParam = searchParamsObj[key];
        if (!currentParam) return;
        const parsed = parseFilterValue(currentParam);
        if (!parsed) {
          queryParams({ del: [key, "page"] });
          return;
        }
        const newValues = parsed.values.filter((v) => v !== value);
        if (newValues.length === 0) {
          queryParams({ del: [key, "page"] });
        } else {
          const newParam = parsed.operator.includes("NOT")
            ? `-${newValues.join(",")}`
            : newValues.join(",");
          queryParams({ set: { [key]: newParam }, del: "page" });
        }
        return;
      }

      queryParams({
        del: [key, "page"],
      });
    },
    [searchParamsObj, queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["status", "search", "partnerId", "invoiceId", "groupId"],
      }),
    [queryParams],
  );

  const onToggleOperator = useCallback(
    (key: string) => {
      const currentParam = searchParamsObj[key];
      if (!currentParam) return;
      const isNegated = currentParam.startsWith("-");
      const cleanValue = isNegated ? currentParam.slice(1) : currentParam;
      queryParams({
        set: { [key]: isNegated ? cleanValue : `-${cleanValue}` },
        del: "page",
      });
    },
    [searchParamsObj, queryParams],
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    onToggleOperator,
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
