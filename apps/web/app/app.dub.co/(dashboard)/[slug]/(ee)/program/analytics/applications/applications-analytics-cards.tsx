"use client";

import {
  getReferralSourceDisplayValue,
  STAGE_VALUE_KEY,
} from "@/lib/application-events/utils";
import { ApplicationEventStages } from "@/lib/types";
import { AnalyticsLoadingSpinner } from "@/ui/analytics/analytics-loading-spinner";
import { BarList } from "@/ui/analytics/bar-list";
import { Modal, TabSelect, useRouterStuff } from "@dub/ui";
import {
  CircleCheck,
  CircleDotted,
  CircleHalfDottedClock,
  FlagWavy,
} from "@dub/ui/icons";
import { cn, COUNTRIES, parseFilterValue } from "@dub/utils";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { ApplicationReferralSourceIcon } from "./application-referral-source-icon";
import { useApplicationsAnalytics } from "./use-applications-analytics";

type AnalyticsTab = "referralSource" | "country";

type StageValueKey = (typeof STAGE_VALUE_KEY)[ApplicationEventStages];

const STAGE_ICONS: Record<ApplicationEventStages, React.ElementType> = {
  visited: CircleDotted,
  started: CircleHalfDottedClock,
  submitted: CircleHalfDottedClock,
  approved: CircleCheck,
};

function ApplicationsAnalyticsCardShell({
  tab,
  title,
  stage,
  barBackground,
  hoverBackground,
  data,
  isLoading,
  mapRow,
}: {
  tab: AnalyticsTab;
  title: string;
  stage: ApplicationEventStages;
  barBackground: string;
  hoverBackground: string;
  data: unknown[] | undefined;
  isLoading: boolean;
  mapRow: (
    row: any,
    stageKey: StageValueKey,
  ) => {
    icon: ReactNode;
    title: string;
    filterValue: string;
    value: number;
  };
}) {
  const { queryParams, searchParamsObj } = useRouterStuff();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const filterParamKey = tab;
  const isFilterActive = typeof searchParamsObj[filterParamKey] === "string";

  const activeFilterValues = useMemo(() => {
    const raw = searchParamsObj[filterParamKey];
    if (typeof raw !== "string" || raw.length === 0) return [];
    return parseFilterValue(raw)?.values ?? raw.split(",").filter(Boolean);
  }, [filterParamKey, searchParamsObj]);

  const stageKey = STAGE_VALUE_KEY[stage];
  const StageIcon = STAGE_ICONS[stage];

  const mapped = useMemo(() => {
    const rows = data ?? [];
    return rows
      .map((row) => mapRow(row, stageKey))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, mapRow, stageKey]);

  const maxValue = useMemo(
    () => Math.max(0, ...mapped.map((d) => d.value)),
    [mapped],
  );

  const onToggleFilter = useCallback((val: string) => {
    setSelectedItems((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }, []);

  const onApplyFilterValues = useCallback(
    (values: string[]) => {
      if (values.length === 0) {
        queryParams({ del: [filterParamKey, "page"], scroll: false });
      } else {
        queryParams({
          set: { [filterParamKey]: values.join(",") },
          del: "page",
          scroll: false,
        });
      }
      setSelectedItems([]);
    },
    [filterParamKey, queryParams],
  );

  const onClearFilter = useCallback(() => {
    setSelectedItems([]);
    if (isFilterActive) {
      queryParams({ del: [filterParamKey, "page"], scroll: false });
    }
  }, [filterParamKey, isFilterActive, queryParams]);

  const EXPAND_LIMIT = 8;
  const [showModal, setShowModal] = useState(false);
  const showViewAll = mapped.length > EXPAND_LIMIT;

  return (
    <>
      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        className="max-w-lg px-0"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-1 text-neutral-500">
            <StageIcon className="h-4 w-4" />
            <p className="text-xs uppercase">{STAGE_VALUE_KEY[stage]}</p>
          </div>
        </div>
        <BarList
          tab={`Application ${tab === "referralSource" ? "source" : "country"}`}
          unit="applications"
          data={mapped}
          maxValue={maxValue}
          barBackground={barBackground}
          hoverBackground={hoverBackground}
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
        />
      </Modal>

      <div className="group relative z-0 h-[400px] overflow-hidden rounded-lg border border-neutral-200 bg-white sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4">
          <TabSelect
            options={[{ id: tab, label: title }]}
            selected={tab}
            onSelect={() => {}}
          />
          <div className="flex items-center gap-1 pr-2 text-neutral-500">
            <StageIcon className="hidden h-4 w-4 sm:block" />
            <p className="text-xs uppercase">{STAGE_VALUE_KEY[stage]}</p>
          </div>
        </div>

        <div className="py-4">
          {isLoading ? (
            <div className="absolute inset-0 flex h-[300px] w-full items-center justify-center bg-white/50">
              <AnalyticsLoadingSpinner />
            </div>
          ) : mapped.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-neutral-600">No data available</p>
            </div>
          ) : (
            <BarList
              tab={`Application ${tab === "referralSource" ? "source" : "country"}`}
              unit="applications"
              data={mapped}
              maxValue={maxValue}
              barBackground={barBackground}
              hoverBackground={hoverBackground}
              filterSelectedBackground="bg-neutral-900"
              filterSelectedHoverBackground="hover:bg-neutral-700"
              filterHoverClass="bg-white border border-neutral-200"
              setShowModal={setShowModal}
              limit={EXPAND_LIMIT}
              selectedFilterValues={selectedItems}
              activeFilterValues={activeFilterValues}
              onToggleFilter={onToggleFilter}
              onClearFilter={onClearFilter}
              onClearSelection={() => setSelectedItems([])}
              onApplyFilterValues={onApplyFilterValues}
              onRowFilterItem={(val) => onApplyFilterValues([val])}
            />
          )}
        </div>

        {(showViewAll || isFilterActive) && (
          <div className="absolute bottom-0 left-0 z-10 flex w-full items-end">
            <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-full bg-gradient-to-t from-white" />
            <div className="relative flex w-full items-center justify-center gap-2 py-4">
              <button
                onClick={() => setShowModal(true)}
                className={cn(
                  "h-8 w-fit rounded-lg px-3 text-sm transition-colors",
                  isFilterActive
                    ? "border-black bg-black text-white hover:bg-neutral-800"
                    : "border border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-100 active:border-neutral-300",
                )}
              >
                View All
              </button>
              {isFilterActive && (
                <button
                  onClick={onClearFilter}
                  className="h-8 w-fit rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 active:border-neutral-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function ApplicationsAnalyticsCards({
  stage,
}: {
  stage: ApplicationEventStages;
}) {
  const { data: referralSources, isLoading: referralSourcesLoading } =
    useApplicationsAnalytics({ groupBy: "referralSource" });

  const { data: countries, isLoading: countriesLoading } =
    useApplicationsAnalytics({ groupBy: "country" });

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <ApplicationsAnalyticsCardShell
        tab="referralSource"
        title="Application source"
        stage={stage}
        data={referralSources}
        isLoading={referralSourcesLoading}
        mapRow={(row, stageKey) => {
          const source = row.referralSource as string;
          const value = (row?.[stageKey] as number | undefined) ?? 0;
          return {
            icon: <ApplicationReferralSourceIcon referralSource={source} />,
            title: getReferralSourceDisplayValue(source),
            filterValue: source,
            value,
          };
        }}
        barBackground="bg-orange-100"
        hoverBackground="hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent hover:border-orange-500"
      />
      <ApplicationsAnalyticsCardShell
        tab="country"
        title="Application country"
        stage={stage}
        data={countries}
        isLoading={countriesLoading}
        mapRow={(row, stageKey) => {
          const country = row.country as string;
          const value = (row?.[stageKey] as number | undefined) ?? 0;
          return {
            icon: country ? (
              <img
                alt={`${country} flag`}
                src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                className="size-4 shrink-0"
              />
            ) : (
              <FlagWavy className="size-4 text-neutral-400" />
            ),
            title: country ? COUNTRIES[country] ?? country : "Unknown",
            filterValue: country ?? "Unknown",
            value,
          };
        }}
        barBackground="bg-blue-100"
        hoverBackground="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent hover:border-blue-500"
      />
    </div>
  );
}
