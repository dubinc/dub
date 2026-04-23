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
import { Sliders, User, Users, Users6 } from "@dub/ui/icons";
import { capitalize, FilterOperator, parseFilterValue } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

const COMMISSION_FILTER_KEYS = [
  "partnerId",
  "groupId",
  "customerId",
  "type",
] as const;

export function useCommissionsAnalyticsFilters(
  _commissionsQueryString?: string,
) {
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
    ],
    [partners, customers, groups, slug],
  );

  const activeFilters = useMemo(() => {
    const result: {
      key: string;
      operator: FilterOperator;
      values: string[];
    }[] = [];

    for (const key of COMMISSION_FILTER_KEYS) {
      const raw = searchParamsObj[key];
      if (!raw) continue;
      const parsed = parseFilterValue(raw);
      if (parsed)
        result.push({ key, operator: parsed.operator, values: parsed.values });
    }

    return result;
  }, [
    searchParamsObj.partnerId,
    searchParamsObj.groupId,
    searchParamsObj.customerId,
    searchParamsObj.type,
  ]);

  const onSelect = useCallback(
    (key: string, value: string) => {
      const currentParam = searchParamsObj[key];

      if (!currentParam) {
        queryParams({ set: { [key]: value }, del: "page", scroll: false });
        return;
      }

      const parsed = parseFilterValue(currentParam);
      if (parsed && !parsed.values.includes(value)) {
        const newValues = [...parsed.values, value];
        const newParam = parsed.operator.includes("NOT")
          ? `-${newValues.join(",")}`
          : newValues.join(",");
        queryParams({ set: { [key]: newParam }, del: "page", scroll: false });
      }
    },
    [searchParamsObj, queryParams],
  );

  const onRemove = useCallback(
    (key: string, value: string) => {
      const currentParam = searchParamsObj[key];
      if (!currentParam) return;

      const parsed = parseFilterValue(currentParam);
      if (!parsed) {
        queryParams({ del: [key, "page"], scroll: false });
        return;
      }

      const newValues = parsed.values.filter((v) => v !== value);
      if (newValues.length === 0) {
        queryParams({ del: [key, "page"], scroll: false });
      } else {
        const newParam = parsed.operator.includes("NOT")
          ? `-${newValues.join(",")}`
          : newValues.join(",");
        queryParams({ set: { [key]: newParam }, scroll: false });
      }
    },
    [searchParamsObj, queryParams],
  );

  const onRemoveFilter = useCallback(
    (key: string) => queryParams({ del: [key, "page"], scroll: false }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: [...COMMISSION_FILTER_KEYS, "page"],
        scroll: false,
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
        scroll: false,
      });
    },
    [searchParamsObj, queryParams],
  );

  const onOpenFilter = useCallback(
    (key: string | null) => setSelectedFilter(key),
    [],
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveFilter,
    onRemoveAll,
    onToggleOperator,
    onOpenFilter,
    setSearch,
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
        ? searchParamsObj.partnerId.replace(/^-/, "").split(",").filter(Boolean)
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
        ? searchParamsObj.customerId
            .replace(/^-/, "")
            .split(",")
            .filter(Boolean)
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
