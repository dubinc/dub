import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useProgramCustomers from "@/lib/swr/use-program-customers";
import useProgramCustomersCount from "@/lib/swr/use-program-customers-count";
import useSalesCount from "@/lib/swr/use-sales-count";
import { CustomerProps, EnrolledPartnerProps } from "@/lib/types";
import { CUSTOMERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/customers";
import { PARTNERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partners";
import { CircleDotted, useRouterStuff } from "@dub/ui";
import { User, Users } from "@dub/ui/src/icons";
import { cn, DICEBEAR_AVATAR_URL, nFormatter } from "@dub/utils";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { SaleStatusBadges } from "./sale-table";

export function useSaleFilters() {
  const { salesCount } = useSalesCount();
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
          customers?.map(({ id, name, avatar }) => {
            return {
              value: id,
              label: name,
              icon: (
                <img
                  src={avatar || `${DICEBEAR_AVATAR_URL}${name}`}
                  alt={`${name} avatar`}
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
    [salesCount, partners, customers],
  );

  const activeFilters = useMemo(() => {
    const { status, partnerId, customerId, payoutId } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(partnerId ? [{ key: "partnerId", value: partnerId }] : []),
      ...(customerId ? [{ key: "customerId", value: customerId }] : []),
      ...(payoutId ? [{ key: "payoutId", value: payoutId }] : []),
    ];
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
      del: ["status", "partnerId", "customerId", "payoutId"],
    });

  const isFiltered = activeFilters.length > 0 || searchParamsObj.search;

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

  const { partnersCount } = usePartnersCount();
  const partnersAsync = Boolean(
    partnersCount && partnersCount["all"] > PARTNERS_MAX_PAGE_SIZE,
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

function useCustomerFilterOptions(search: string) {
  const { searchParamsObj } = useRouterStuff();

  const { customersCount } = useProgramCustomersCount();
  const customersAsync = Boolean(
    customersCount && customersCount > CUSTOMERS_MAX_PAGE_SIZE,
  );

  const { data: customers, loading: customersLoading } = useProgramCustomers({
    query: { search: customersAsync ? search : "" },
  });

  const { data: selectedCustomers } = useProgramCustomers({
    query: {
      ids: searchParamsObj.customerId
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
        ] as (CustomerProps & { hideDuringSearch?: boolean })[]) ?? null;
  }, [
    customersLoading,
    customers,
    selectedCustomers,
    searchParamsObj.customerId,
  ]);

  return { customers: result, customersAsync };
}
