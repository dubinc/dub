"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { AnalyticsResponseOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import Devices from "@/ui/analytics/devices";
import Locations from "@/ui/analytics/locations";
import Referer from "@/ui/analytics/referer";
import TopLinks from "@/ui/analytics/top-links";
import { useAnalyticsFilters } from "@/ui/analytics/use-analytics-filters";
import { useAnalyticsQuery } from "@/ui/analytics/use-analytics-query";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  Button,
  Filter,
  SquareLayoutGrid6,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import Link from "next/link";
import { ContextType, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsChart } from "./analytics-chart";
import { AnalyticsPartnersTable } from "./analytics-partners-table";

export function ProgramAnalyticsPageClient() {
  const { slug, defaultProgramId } = useWorkspace();
  const { program } = useProgram();
  const { searchParamsObj, getQueryString } = useRouterStuff();
  const { isMobile } = useMediaQuery();

  const { start, end, interval, selectedTab, saleUnit, view } = useMemo(() => {
    const { event, ...rest } = searchParamsObj;

    return {
      interval: DUB_PARTNERS_ANALYTICS_INTERVAL,
      selectedTab:
        event || (program?.primaryRewardEvent === "lead" ? "leads" : "sales"),
      saleUnit: "saleAmount",
      view: "timeseries",
      ...rest,
    } as ContextType<typeof AnalyticsContext>;
  }, [searchParamsObj]);

  const queryString = editQueryString(
    useAnalyticsQuery({
      defaultEvent: program?.primaryRewardEvent === "lead" ? "leads" : "sales",
      defaultInterval: DUB_PARTNERS_ANALYTICS_INTERVAL,
    }).queryString,
    {
      programId: defaultProgramId!,
    },
  );

  const { data: totalEvents } = useSWR<{
    [key in AnalyticsResponseOptions]: number;
  }>(
    `/api/analytics?${editQueryString(queryString ?? "", {
      event: "composite",
    })}`,
    fetcher,
    {
      keepPreviousData: true,
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
      selectedTab,
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
          <div className="flex grow justify-end gap-2">
            <Link
              href={`/${slug}/events${getQueryString({ folderId: program?.defaultFolderId, event: selectedTab, interval })}`}
            >
              <Button
                variant="secondary"
                className="w-fit"
                icon={
                  <SquareLayoutGrid6 className="h-4 w-4 text-neutral-600" />
                }
                text={isMobile ? undefined : "View Events"}
              />
            </Link>
          </div>
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
            onSelect={onSelect}
            onRemove={onRemove}
            onRemoveAll={onRemoveAll}
          />
        </div>
      </div>
      <AnalyticsContext.Provider
        value={{
          basePath: "",
          baseApiPath: "/api/analytics",
          selectedTab,
          saleUnit,
          view,
          queryString,
          start: start ? new Date(start) : undefined,
          end: end ? new Date(end) : undefined,
          interval,
          totalEvents,
        }}
      >
        <div className="border-border-subtle divide-border-subtle divide-y overflow-hidden border sm:rounded-2xl">
          <AnalyticsChart />
          <AnalyticsPartnersTable />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TopLinks filterLinks={false} />
          <Referer />
          <Locations />
          <Devices />
        </div>
      </AnalyticsContext.Provider>
    </div>
  );
}
