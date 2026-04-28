"use client";

import { AnalyticsCard } from "@/ui/analytics/analytics-card";
import { AnalyticsLoadingSpinner } from "@/ui/analytics/analytics-loading-spinner";
import { BarList } from "@/ui/analytics/bar-list";
import { useRouterStuff } from "@dub/ui";
import { FlagWavy, Globe2 } from "@dub/ui/icons";
import { COUNTRIES } from "@dub/utils";
import { useApplicationsAnalyticsGrouped } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/analytics/application-events/use-applications-analytics";
import { useCallback, useMemo, useState } from "react";
import {
  ApplicationsStage,
  useApplicationsAnalyticsQueryString,
} from "./use-applications-analytics-query";

type BreakdownTab = "referralSource" | "country";

function getStageValueKey(stage: ApplicationsStage) {
  if (stage === "started") return "starts";
  if (stage === "submitted") return "submissions";
  if (stage === "approved") return "approvals";
  return "visits";
}

export function ApplicationsBreakdownCards({
  stage,
}: {
  stage: ApplicationsStage;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <BreakdownCard
        tab="referralSource"
        title="Application source"
        stage={stage}
      />
      <BreakdownCard tab="country" title="Country" stage={stage} />
    </div>
  );
}

function BreakdownCard({
  tab,
  title,
  stage,
}: {
  tab: BreakdownTab;
  title: string;
  stage: ApplicationsStage;
}) {
  const { queryParams, searchParams } = useRouterStuff();
  const { buildQueryString, workspaceId } =
    useApplicationsAnalyticsQueryString();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const queryString = buildQueryString({
    include: [
      "start",
      "end",
      "partnerId",
      "groupId",
      "country",
      "referralSource",
    ],
  });

  const groupBy = tab;

  const { data, isLoading } = useApplicationsAnalyticsGrouped({
    groupBy,
    queryString,
    enabled: Boolean(workspaceId),
  });

  const filterParamKey =
    tab === "referralSource" ? "referralSource" : "country";

  const isFilterActive = searchParams.has(filterParamKey);
  const activeFilterValues = useMemo(
    () => searchParams.get(filterParamKey)?.split(",").filter(Boolean) ?? [],
    [filterParamKey, searchParams],
  );

  const onToggleFilter = useCallback((val: string) => {
    setSelectedItems((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }, []);

  const onApplyFilterValues = useCallback(
    (values: string[]) => {
      if (values.length === 0) {
        queryParams({ del: filterParamKey, scroll: false });
      } else {
        queryParams({
          set: { [filterParamKey]: values.join(",") },
          scroll: false,
        });
      }
      setSelectedItems([]);
    },
    [filterParamKey, queryParams],
  );

  const onClearFilter = useCallback(() => {
    setSelectedItems([]);
    if (isFilterActive) queryParams({ del: filterParamKey, scroll: false });
  }, [filterParamKey, isFilterActive, queryParams]);

  const stageKey = getStageValueKey(stage);

  const mapped = useMemo(() => {
    const rows = data ?? [];

    return rows
      .map((d: any) => {
        const rawKey = tab === "country" ? d.country : d.referralSource;
        const key = rawKey ?? "Unknown";
        const value = (d?.[stageKey] as number | undefined) ?? 0;
        return {
          icon:
            tab === "country" ? (
              rawKey ? (
                <img
                  alt={rawKey}
                  src={`https://hatscripts.github.io/circle-flags/flags/${String(rawKey).toLowerCase()}.svg`}
                  className="size-4 shrink-0"
                />
              ) : (
                <FlagWavy className="size-4 text-neutral-400" />
              )
            ) : (
              <Globe2 className="size-4 text-neutral-500" />
            ),
          title:
            tab === "country"
              ? rawKey
                ? COUNTRIES[String(rawKey)] ?? String(rawKey)
                : "Unknown"
              : String(key),
          filterValue: String(key),
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [data, stageKey, tab]);

  const maxValue = useMemo(
    () => Math.max(0, ...mapped.map((d) => d.value)),
    [mapped],
  );

  return (
    <AnalyticsCard
      tabs={[
        { id: tab, label: title, icon: tab === "country" ? FlagWavy : Globe2 },
      ]}
      selectedTabId={tab}
      onSelectTab={() => {}}
      expandLimit={8}
      dataLength={mapped.length}
      isFilterActive={isFilterActive}
      onClearFilter={onClearFilter}
    >
      {({ limit, setShowModal }) =>
        isLoading ? (
          <div className="absolute inset-0 flex h-[300px] w-full items-center justify-center bg-white/50">
            <AnalyticsLoadingSpinner />
          </div>
        ) : mapped.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-sm text-neutral-600">No data available</p>
          </div>
        ) : (
          <BarList
            tab={tab}
            unit="applications"
            data={mapped}
            maxValue={maxValue}
            barBackground={tab === "country" ? "bg-blue-100" : "bg-neutral-100"}
            hoverBackground={
              tab === "country"
                ? "hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent hover:border-blue-500"
                : "hover:bg-gradient-to-r hover:from-neutral-50 hover:to-transparent hover:border-neutral-300"
            }
            filterSelectedBackground="bg-neutral-900"
            filterSelectedHoverBackground="hover:bg-neutral-700"
            filterHoverClass="bg-white border border-neutral-200"
            setShowModal={setShowModal}
            selectedFilterValues={selectedItems}
            activeFilterValues={activeFilterValues}
            onToggleFilter={onToggleFilter}
            onClearFilter={onClearFilter}
            onClearSelection={() => setSelectedItems([])}
            onApplyFilterValues={onApplyFilterValues}
            onRowFilterItem={(val) => onApplyFilterValues([val])}
            {...(limit && { limit })}
          />
        )
      }
    </AnalyticsCard>
  );
}
