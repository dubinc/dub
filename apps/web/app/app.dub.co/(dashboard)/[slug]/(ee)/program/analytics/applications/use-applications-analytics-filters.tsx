"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { useRouterStuff } from "@dub/ui";
import { FlagWavy, Globe2, Users } from "@dub/ui/icons";
import {
  COUNTRIES,
  FilterOperator,
  nFormatter,
  parseFilterValue,
} from "@dub/utils";
import { useCallback, useMemo } from "react";
import { useApplicationsAnalytics } from "./use-applications-analytics";
import { useApplicationsAnalyticsQuery } from "./use-applications-analytics-query";

const FILTER_KEYS = ["partnerId", "country", "referralSource"] as const;

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
    groupBy: "partnerId",
    exclude: ["partnerId"],
  });

  const { data: referralSources } = useApplicationsAnalytics({
    groupBy: "referralSource",
    exclude: ["referralSource"],
  });

  const { data: countries } = useApplicationsAnalytics({
    groupBy: "country",
    exclude: ["country"],
  });

  const filters = useMemo(
    () => [
      {
        key: "partnerId",
        icon: Users,
        label: "Partner",
        shouldFilter: false,
        options:
          partners
            ?.filter((row) => row[stageMetricKey] > 0)
            .map((row) => {
              const partner = row.partner;

              return {
                value: partner.id,
                label: partner.name,
                icon: <PartnerAvatar partner={partner} className="size-4" />,
                right: nFormatter(row[stageMetricKey]),
              };
            }) ?? [],
      },
      {
        key: "referralSource",
        icon: Globe2,
        label: "Source",
        labelPlural: "sources",
        options:
          referralSources
            ?.filter((row) => row[stageMetricKey] > 0)
            .map((row) => ({
              value: row.referralSource,
              label: row.referralSource,
              right: nFormatter(row[stageMetricKey]),
            })) ?? [],
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
          countries
            ?.filter((row) => row[stageMetricKey] > 0)
            .map((row) => ({
              value: row.country,
              label: COUNTRIES[row.country] ?? row.country,
              right: nFormatter(row[stageMetricKey]),
            })) ?? [],
      },
    ],
    [countries, partners, referralSources, slug, stageMetricKey],
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
