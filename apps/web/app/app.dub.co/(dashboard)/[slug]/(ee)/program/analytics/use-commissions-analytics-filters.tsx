"use client";

import useCustomers from "@/lib/swr/use-customers";
import useGroups from "@/lib/swr/use-groups";
import usePartners from "@/lib/swr/use-partners";
import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerProps, EnrolledPartnerProps } from "@/lib/types";
import { CustomerAvatar } from "@/ui/customers/customer-avatar";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { CommissionType } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { FlagWavy, Sliders, User, Users, Users6 } from "@dub/ui/icons";
import { capitalize, COUNTRIES } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

// Top countries to show as options for the location filter (UI only, no API yet)
const TOP_COUNTRY_CODES = [
  "US",
  "CA",
  "GB",
  "DE",
  "FR",
  "AU",
  "BR",
  "IN",
  "JP",
  "MX",
  "NL",
  "ES",
  "IT",
  "SE",
  "NO",
  "DK",
  "FI",
  "CH",
  "AT",
  "NZ",
];

export function useCommissionsAnalyticsFilters() {
  const { slug } = useWorkspace();
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
        key: "partnerId",
        icon: Users,
        label: "Partner",
        shouldFilter: false,
        options:
          partners?.map((partner) => ({
            value: partner.id,
            label: partner.name,
            icon: <PartnerAvatar partner={partner} className="size-4" />,
          })) ?? null,
      },
      {
        key: "groupId",
        icon: Users6,
        label: "Partner Group",
        options:
          groups?.map((group) => ({
            value: group.id,
            label: group.name,
            icon: <GroupColorCircle group={group} />,
            permalink: `/${slug}/program/groups/${group.slug}/rewards`,
          })) ?? null,
      },
      {
        key: "customerId",
        icon: User,
        label: "Customer",
        shouldFilter: false,
        options:
          customers?.map((customer) => ({
            value: customer.id,
            label: customer.email ?? customer.name,
            icon: <CustomerAvatar customer={customer} className="size-4" />,
          })) ?? null,
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
        key: "country",
        icon: FlagWavy,
        label: "Location",
        getOptionIcon: (value: unknown) => {
          if (typeof value !== "string") return null;
          return (
            <img
              alt={value}
              src={`https://hatscripts.github.io/circle-flags/flags/${value.toLowerCase()}.svg`}
              className="size-4 shrink-0"
            />
          );
        },
        options: TOP_COUNTRY_CODES.filter((c) => COUNTRIES[c]).map((code) => ({
          value: code,
          label: COUNTRIES[code],
        })),
      },
    ],
    [partners, customers, groups, slug],
  );

  const activeFilters = useMemo(() => {
    const { partnerId, groupId, customerId, type, country } = searchParamsObj;
    return [
      ...(partnerId ? [{ key: "partnerId", value: partnerId }] : []),
      ...(groupId ? [{ key: "groupId", value: groupId }] : []),
      ...(customerId ? [{ key: "customerId", value: customerId }] : []),
      ...(type ? [{ key: "type", value: type }] : []),
      ...(country ? [{ key: "country", value: country }] : []),
    ];
  }, [
    searchParamsObj.partnerId,
    searchParamsObj.groupId,
    searchParamsObj.customerId,
    searchParamsObj.type,
    searchParamsObj.country,
  ]);

  const onSelect = useCallback(
    (key: string, value: string) =>
      queryParams({ set: { [key]: value }, del: "page", scroll: false }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) => queryParams({ del: [key, "page"], scroll: false }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["partnerId", "groupId", "customerId", "type", "country", "page"],
        scroll: false,
      }),
    [queryParams],
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
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

  return {
    partners: partnersLoading
      ? null
      : ([
          ...(partners ?? []),
          ...(selectedPartners
            ?.filter((sp) => !partners?.some((p) => p.id === sp.id))
            ?.map((sp) => ({ ...sp, hideDuringSearch: true })) ?? []),
        ] as (EnrolledPartnerProps & { hideDuringSearch?: boolean })[]),
  };
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

  return {
    customers: customersLoading
      ? null
      : ([
          ...(customers ?? []),
          ...(selectedCustomers
            ?.filter((sc) => !customers?.some((c) => c.id === sc.id))
            ?.map((sc) => ({ ...sc, hideDuringSearch: true })) ?? []),
        ] as (CustomerProps & { hideDuringSearch?: boolean })[]),
  };
}
