"use client";

import useCommissionAnalytics from "@/lib/swr/use-commission-analytics";
import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { CommissionType } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { Sliders, Tag, Users, Users6 } from "@dub/ui/icons";
import {
  currencyFormatter,
  FilterOperator,
  nFormatter,
  parseFilterValue,
} from "@dub/utils";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

const FILTER_KEYS = ["partnerId", "groupId", "partnerTagId", "type"] as const;

type CategoryRow = { earnings: number; count: number };
type PartnerRow = { earnings: number; commissionCount: number };

function metricValue(
  commissionUnit: string | undefined,
  row: CategoryRow | PartnerRow,
) {
  if (commissionUnit === "count") {
    return "commissionCount" in row ? row.commissionCount : row.count;
  }
  return row.earnings;
}

function formatMetricRight(
  commissionUnit: string | undefined,
  row: CategoryRow | PartnerRow,
) {
  return commissionUnit === "count"
    ? nFormatter(metricValue(commissionUnit, row), { full: true })
    : currencyFormatter(row.earnings);
}

export function useCommissionsAnalyticsFilters() {
  const { slug } = useWorkspace();
  const { tab } = useParams() as { tab?: string };
  const { searchParamsObj, queryParams } = useRouterStuff();
  const commissionUnit = searchParamsObj.commissionUnit;

  const filtersTabEnabled = tab === "commissions";

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { groups: programGroups } = useGroups();

  const groupById = useMemo(() => {
    const map = new Map<string, GroupProps>();
    programGroups?.forEach((g) => map.set(g.id, g));
    return map;
  }, [programGroups]);

  const { data: partners } = useCommissionAnalytics({
    groupBy: "partnerId",
    exclude: ["partnerId"],
    enabled: filtersTabEnabled,
  });

  const { data: groups } = useCommissionAnalytics({
    groupBy: "groupId",
    exclude: ["groupId"],
    enabled: filtersTabEnabled,
  });

  const { data: partnerTags } = useCommissionAnalytics({
    groupBy: "partnerTagId",
    exclude: ["partnerTagId"],
    enabled: filtersTabEnabled,
  });

  const { data: types } = useCommissionAnalytics({
    groupBy: "type",
    exclude: ["type"],
    enabled: filtersTabEnabled,
  });

  const partnerSearch =
    selectedFilter === "partnerId" ? debouncedSearch.trim().toLowerCase() : "";

  const filters = useMemo(
    () => [
      {
        key: "partnerId",
        icon: Users,
        label: "Partner",
        shouldFilter: false,
        options:
          partners
            ?.filter((row) => metricValue(commissionUnit, row) > 0)
            .filter(
              (row) =>
                !partnerSearch ||
                row.name.toLowerCase().includes(partnerSearch),
            )
            .map((row) => ({
              value: row.partnerId,
              label: row.name,
              icon: (
                <PartnerAvatar
                  partner={{
                    id: row.partnerId,
                    name: row.name,
                    image: row.image,
                  }}
                  className="size-4"
                />
              ),
              right: formatMetricRight(commissionUnit, row),
            })) ?? [],
      },
      {
        key: "groupId",
        icon: Users6,
        label: "Partner Group",
        options:
          groups
            ?.filter((row) => metricValue(commissionUnit, row) > 0)
            .map((row) => {
              const group = groupById.get(row.key);
              return {
                value: row.key,
                label: row.label,
                icon: (
                  <GroupColorCircle group={{ color: group?.color ?? null }} />
                ),
                permalink: group
                  ? `/${slug}/program/groups/${group.slug}/rewards`
                  : undefined,
                right: formatMetricRight(commissionUnit, row),
              };
            }) ?? [],
      },
      {
        key: "partnerTagId",
        icon: Tag,
        label: "Partner Tag",
        options:
          partnerTags
            ?.filter((row) => metricValue(commissionUnit, row) > 0)
            .map((row) => ({
              value: row.key,
              label: row.label,
              right: formatMetricRight(commissionUnit, row),
            })) ?? [],
      },
      {
        key: "type",
        icon: Sliders,
        label: "Type",
        options:
          types
            ?.filter((row) => metricValue(commissionUnit, row) > 0)
            .map((row) => ({
              value: row.key,
              label: row.label,
              icon: <CommissionTypeIcon type={row.key as CommissionType} />,
              right: formatMetricRight(commissionUnit, row),
            })) ?? [],
      },
    ],
    [
      partners,
      groups,
      partnerTags,
      types,
      commissionUnit,
      partnerSearch,
      groupById,
      slug,
    ],
  );

  const activeFilters = useMemo(() => {
    const result: {
      key: string;
      operator: FilterOperator;
      values: string[];
    }[] = [];

    for (const key of FILTER_KEYS) {
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
    searchParamsObj.partnerTagId,
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
        queryParams({ set: { [key]: newParam }, del: "page", scroll: false });
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
        del: [...FILTER_KEYS, "customerId", "page"],
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
        del: "page",
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
