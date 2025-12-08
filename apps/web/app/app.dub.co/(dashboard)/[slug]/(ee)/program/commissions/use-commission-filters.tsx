import useCommissionsCount from "@/lib/swr/use-commissions-count";
import useCustomers from "@/lib/swr/use-customers";
import useGroups from "@/lib/swr/use-groups";
import usePartners from "@/lib/swr/use-partners";
import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerProps, EnrolledPartnerProps } from "@/lib/types";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { CircleDotted, useRouterStuff } from "@dub/ui";
import { Sliders, User, Users, Users6 } from "@dub/ui/icons";
import { capitalize, cn, nFormatter, OG_AVATAR_URL } from "@dub/utils";
import { CommissionType } from "@prisma/client";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

export function useCommissionFilters() {
  const { slug } = useWorkspace();
  const { commissionsCount } = useCommissionsCount({ exclude: ["status"] });
  const { searchParamsObj, queryParams } = useRouterStuff();

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { partners } = usePartnerFilterOptions(
    selectedFilter === "partnerId" ? debouncedSearch : "",
  );

  const { customers } = useCustomerFilterOptions(
    selectedFilter === "customerId" ? debouncedSearch : "",
  );

  const { groups } = useGroups();

  const filters = useMemo(
    () => [
      {
        key: "customerId",
        icon: User,
        label: "Customer",
        shouldFilter: false,
        options:
          customers?.map(({ id, email, name, avatar }) => {
            return {
              value: id,
              label: email ?? name,
              icon: (
                <img
                  src={avatar || `${OG_AVATAR_URL}${id}`}
                  alt={`${email} avatar`}
                  className="size-4 rounded-full"
                />
              ),
            };
          }) ?? null,
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
        key: "type",
        icon: Sliders,
        label: "Type",
        options: Object.values(CommissionType).map((type) => ({
          value: type,
          label: capitalize(type) as string,
          icon: <CommissionTypeIcon type={type} />,
        })),
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(CommissionStatusBadges)
          .filter(([key]) => key !== "hold")
          .map(([value, { label }]) => {
            const Icon = CommissionStatusBadges[value].icon;
            return {
              value,
              label,
              icon: (
                <Icon
                  className={cn(
                    CommissionStatusBadges[value].className,
                    "size-4 bg-transparent",
                  )}
                />
              ),
              right: commissionsCount?.[value]?.count
                ? nFormatter(commissionsCount[value].count, {
                    full: true,
                  })
                : undefined,
            };
          }),
      },
    ],
    [commissionsCount, partners, customers, groups],
  );

  const activeFilters = useMemo(() => {
    const { customerId, partnerId, status, type, payoutId, groupId } =
      searchParamsObj;

    return [
      ...(customerId ? [{ key: "customerId", value: customerId }] : []),
      ...(partnerId ? [{ key: "partnerId", value: partnerId }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
      ...(type ? [{ key: "type", value: type }] : []),
      ...(payoutId ? [{ key: "payoutId", value: payoutId }] : []),
      ...(groupId ? [{ key: "groupId", value: groupId }] : []),
    ];
  }, [
    searchParamsObj.customerId,
    searchParamsObj.partnerId,
    searchParamsObj.status,
    searchParamsObj.type,
    searchParamsObj.payoutId,
    searchParamsObj.groupId,
  ]);

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
        del: ["status", "partnerId", "customerId", "payoutId", "groupId"],
      }),
    [queryParams],
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

function useCustomerFilterOptions(search: string) {
  const { searchParamsObj } = useRouterStuff();

  const { customers, loading: customersLoading } = useCustomers({
    query: { search },
  });

  const { customers: selectedCustomers } = useCustomers({
    query: {
      customerIds: searchParamsObj.customerId
        ? [searchParamsObj.customerId]
        : undefined,
    },
  });

  const result = useMemo(() => {
    return customersLoading ||
      // Consider partners loading if we can't find the currently filtered partner
      (searchParamsObj.customerId &&
        ![...(selectedCustomers ?? []), ...(customers ?? [])].some(
          (p) => p.id === searchParamsObj.customerId,
        ))
      ? null
      : ([
          ...(customers ?? []),
          // Add selected partner to list if not already in partners
          ...(selectedCustomers
            ?.filter((st) => !customers?.some((t) => t.id === st.id))
            ?.map((st) => ({ ...st, hideDuringSearch: true })) ?? []),
        ] as (CustomerProps & { hideDuringSearch?: boolean })[]);
  }, [
    customersLoading,
    customers,
    selectedCustomers,
    searchParamsObj.customerId,
  ]);

  return { customers: result };
}
