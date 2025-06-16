"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { AnalyticsSaleUnit, IntervalOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { useAnalyticsFilters } from "@/ui/analytics/use-analytics-filters";
import { useAnalyticsQuery } from "@/ui/analytics/use-analytics-query";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Filter, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import { createContext, useMemo } from "react";
import { AnalyticsChart } from "./analytics-chart";
import { AnalyticsPartnersTable } from "./analytics-partners-table";

type ProgramAnalyticsContextType = {
  start?: string;
  end?: string;
  interval?: IntervalOptions;
  event: "sales" | "leads" | "clicks";
  saleUnit: AnalyticsSaleUnit;
  queryString?: string;
};

export const ProgramAnalyticsContext =
  createContext<ProgramAnalyticsContextType>({
    event: "sales",
    saleUnit: "saleAmount",
  });

export function ProgramAnalyticsPageClient() {
  const { defaultProgramId } = useWorkspace();
  const { searchParamsObj } = useRouterStuff();

  const { start, end, interval, event, saleUnit } = useMemo(
    () =>
      ({
        interval: DUB_PARTNERS_ANALYTICS_INTERVAL,
        event: "sales",
        saleUnit: "saleAmount",
        ...searchParamsObj,
      }) as ProgramAnalyticsContextType,
    [searchParamsObj],
  );

  const queryString = editQueryString(
    useAnalyticsQuery({
      defaultEvent: "sales",
      defaultInterval: DUB_PARTNERS_ANALYTICS_INTERVAL,
    }).queryString,
    {
      programId: defaultProgramId!,
    },
  );

  const {
    filters,
    activeFilters,
    setSearch,
    setSelectedFilter,
    onSelect,
    onRemove,
    onRemoveAll,
    onOpenFilter,
    streaming,
    activeFiltersWithStreaming,
  } = useAnalyticsFilters({
    context: {
      baseApiPath: "/api/analytics",
      queryString,
      selectedTab: event,
      saleUnit,
    },
    programPage: true,
  });

  return (
    <div className="flex flex-col gap-3 pb-12">
      <div>
        <div className="flex items-center gap-2">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSearchChange={setSearch}
            onSelectedFilterChange={setSelectedFilter}
            onSelect={onSelect}
            onRemove={onRemove}
            onOpenFilter={onOpenFilter}
            askAI
          />
          <SimpleDateRangePicker align="start" className="w-fit" />
        </div>
        <div>
          <div
            className={cn(
              "transition-[height] duration-[300ms]",
              streaming || activeFilters.length ? "h-3" : "h-0",
            )}
          />
          <Filter.List
            filters={filters}
            activeFilters={activeFiltersWithStreaming}
            onRemove={onRemove}
            onRemoveAll={onRemoveAll}
          />
        </div>
      </div>
      <ProgramAnalyticsContext.Provider
        value={{ start, end, interval, event, saleUnit, queryString }}
      >
        <div className="border-border-subtle divide-border-subtle divide-y overflow-hidden rounded-2xl border">
          <AnalyticsChart />
          <div>
            <AnalyticsPartnersTable />
          </div>
        </div>
      </ProgramAnalyticsContext.Provider>
    </div>
  );
}
