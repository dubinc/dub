"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { useRouterStuff } from "@dub/ui";
import { FlagWavy, Globe2, Users, Users6 } from "@dub/ui/icons";
import {
  COUNTRIES,
  FilterOperator,
  nFormatter,
  parseFilterValue,
} from "@dub/utils";
import { useCallback, useMemo } from "react";
import { useApplicationsAnalytics } from "./use-applications-analytics";
import { useApplicationsAnalyticsQuery } from "./use-applications-analytics-query";

const FILTER_KEYS = [
  "partnerId",
  "groupId",
  "country",
  "referralSource",
] as const;

export function useApplicationEventsFilters() {
  const { slug } = useWorkspace();
  const { stage } = useApplicationsAnalyticsQuery();
  const { searchParamsObj, queryParams } = useRouterStuff();

  const stageMetricKey = useMemo<
    "visits" | "starts" | "submissions" | "approvals"
  >(() => {
    if (stage === "started") return "starts";
    if (stage === "submitted") return "submissions";
    if (stage === "approved") return "approvals";
    return "visits";
  }, [stage]);

  const { data: partners } = useApplicationsAnalytics({
    groupBy: "partner",
  });

  const { data: partnerGroups } = useApplicationsAnalytics({
    groupBy: "partnerGroup",
  });

  const { data: referralSources } = useApplicationsAnalytics({
    groupBy: "referralSource",
  });

  const { data: countries } = useApplicationsAnalytics({
    groupBy: "country",
  });

  const filters = useMemo(
    () => [
      {
        key: "groupId",
        icon: Users6,
        label: "Group",
        options:
          partnerGroups?.map((row) => {
            const group = row.partnerGroup;

            return {
              value: group.id,
              label: group.name,
              icon: <GroupColorCircle group={group} />,
              right: nFormatter(row[stageMetricKey]),
              permalink: slug
                ? `/${slug}/program/groups/${group.slug}/rewards`
                : undefined,
            };
          }) ?? null,
      },
      {
        key: "partnerId",
        icon: Users,
        label: "Partner",
        shouldFilter: false,
        options:
          partners?.map((row) => {
            const partner = row.partner;

            return {
              value: partner.id,
              label: partner.name,
              icon: <PartnerAvatar partner={partner} className="size-4" />,
            };
          }) ?? null,
      },
      {
        key: "referralSource",
        icon: Globe2,
        label: "Application source",
        labelPlural: "application sources",
        options:
          referralSources?.map((row) => ({
            value: row.referralSource,
            label: row.referralSource,
            right: nFormatter(row[stageMetricKey]),
          })) ?? null,
      },
      {
        key: "country",
        icon: FlagWavy,
        label: "Country",
        labelPlural: "countries",
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
        getOptionLabel: (value: unknown) => {
          if (typeof value !== "string") return String(value);
          return COUNTRIES[value] ?? value;
        },
        options:
          countries?.map((row) => ({
            value: row.country,
            label: COUNTRIES[row.country] ?? row.country,
            right: nFormatter(row[stageMetricKey]),
          })) ?? null,
      },
    ],
    [countries, partnerGroups, partners, referralSources, slug, stageMetricKey],
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
    searchParamsObj.country,
    searchParamsObj.referralSource,
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
        del: [...FILTER_KEYS, "page"],
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

  const onOpenFilter = useCallback((_key: string | null) => {}, []);

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveFilter,
    onRemoveAll,
    onToggleOperator,
    onOpenFilter,
  };
}
