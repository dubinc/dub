import useCommissionsCount from "@/lib/swr/use-commissions-count";
import useCustomers from "@/lib/swr/use-customers";
import useCustomersCount from "@/lib/swr/use-customers-count";
import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import { CustomerProps, EnrolledPartnerProps } from "@/lib/types";
import { CUSTOMERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/customers";
import { PARTNERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partners";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { CircleDotted, useRouterStuff } from "@dub/ui";
import { Sliders, User, Users } from "@dub/ui/icons";
import { capitalize, cn, nFormatter, OG_AVATAR_URL } from "@dub/utils";
import { CommissionType } from "@prisma/client";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

export function useCommissionFilters() {
  const { commissionsCount } = useCommissionsCount();
  const { searchParamsObj, queryParams } = useRouterStuff();

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { partners, partnersAsync } = usePartnerFilterOptions(
    selectedFilter === "partnerId" ? debouncedSearch : "",
  );

  const { customers, customersAsync } = useCustomerFilterOptions(
    selectedFilter === "customerId" ? debouncedSearch : "",
  );

  const filters = useMemo(
    () => [
      {
        key: "customerId",
        icon: User,
        label: "Customer",
        shouldFilter: !customersAsync,
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
        options: Object.entries(CommissionStatusBadges).map(
          ([value, { label }]) => {
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
              right: nFormatter(commissionsCount?.[value]?.count || 0, {
                full: true,
              }),
            };
          },
        ),
      },
    ],
    [commissionsCount, partners, customers],
  );

  const activeFilters = useMemo(() => {
    const { customerId, partnerId, status, type, payoutId } = searchParamsObj;

    return [
      ...(customerId ? [{ key: "customerId", value: customerId }] : []),
      ...(partnerId ? [{ key: "partnerId", value: partnerId }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
      ...(type ? [{ key: "type", value: type }] : []),
      ...(payoutId ? [{ key: "payoutId", value: payoutId }] : []),
    ];
  }, [
    searchParamsObj.customerId,
    searchParamsObj.partnerId,
    searchParamsObj.status,
    searchParamsObj.type,
    searchParamsObj.payoutId,
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
        del: ["status", "partnerId", "customerId", "payoutId"],
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

  const { partnersCount } = usePartnersCount<number>({
    ignoreParams: true,
  });

  const partnersAsync = Boolean(
    partnersCount && partnersCount > PARTNERS_MAX_PAGE_SIZE,
  );

  const { partners, loading: partnersLoading } = usePartners({
    query: { search: partnersAsync ? search : "" },
  });

  const { partners: selectedPartners } = usePartners({
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
        ] as (EnrolledPartnerProps & { hideDuringSearch?: boolean })[]);
  }, [partnersLoading, partners, selectedPartners, searchParamsObj.partnerId]);

  return { partners: result, partnersAsync };
}

function useCustomerFilterOptions(search: string) {
  const { searchParamsObj } = useRouterStuff();

  const { data: customersCount } = useCustomersCount();
  const customersAsync = Boolean(
    customersCount && customersCount > CUSTOMERS_MAX_PAGE_SIZE,
  );

  const { customers, loading: customersLoading } = useCustomers({
    query: { search: customersAsync ? search : "" },
  });

  const { customers: selectedCustomers } = useCustomers({
    query: {
      customerIds: searchParamsObj.customerId
        ? [searchParamsObj.customerId]
        : undefined,
    },
    enabled: customersAsync,
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

  return { customers: result, customersAsync };
}
