"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { AnalyticsResponseOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { DeviceSection } from "@/ui/analytics/device-section";
import { LocationSection } from "@/ui/analytics/location-section";
import { PartnerSection } from "@/ui/analytics/partner-section";
import { ReferrersUTMs } from "@/ui/analytics/referrers-utms";
import { useAnalyticsFilters } from "@/ui/analytics/use-analytics-filters";
import { useAnalyticsQuery } from "@/ui/analytics/use-analytics-query";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Button, Filter, SquareLayoutGrid6, useMediaQuery, useRouterStuff } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ContextType, ReactNode, useMemo } from "react";
import useSWR from "swr";
import { CommissionsBreakdownCards } from "./commissions-breakdown-cards";
import {
  ProgramAnalyticsNav,
  ProgramAnalyticsTabId,
} from "./program-analytics-nav";
import { useCommissionsAnalyticsFilters } from "./use-commissions-analytics-filters";
import { useCommissionsAnalyticsQuery } from "./use-commissions-analytics-query";

export function ProgramAnalyticsShell({ children }: { children: ReactNode }) {
  const { isMobile } = useMediaQuery();
  const { program } = useProgram();
  const { slug, defaultProgramId } = useWorkspace();
  const { searchParamsObj, getQueryString } = useRouterStuff();
  const { tab } = useParams() as { tab?: string };

  const pageTab: ProgramAnalyticsTabId =
    tab && ["performance", "commissions"].includes(tab)
      ? (tab as ProgramAnalyticsTabId)
      : "performance";

  const {
    queryString: commissionsQueryString,
    status: commissionStatus,
  } = useCommissionsAnalyticsQuery();

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
    filters: perfFilters,
    activeFilters: perfActiveFilters,
    onSelect: perfOnSelect,
    onRemove: perfOnRemove,
    onRemoveAll: perfOnRemoveAll,
    onRemoveFilter: perfOnRemoveFilter,
    onOpenFilter: perfOnOpenFilter,
    onToggleOperator: perfOnToggleOperator,
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

  const {
    filters: commFilters,
    activeFilters: commActiveFilters,
    onSelect: commOnSelect,
    onRemove: commOnRemove,
    onRemoveFilter: commOnRemoveFilter,
    onRemoveAll: commOnRemoveAll,
    onToggleOperator: commOnToggleOperator,
    onOpenFilter: commOnOpenFilter,
    setSearch: commSetSearch,
  } = useCommissionsAnalyticsFilters(commissionsQueryString);

  const filterSelect =
    pageTab === "performance" ? (
      <Filter.Select
        className="w-full md:w-fit"
        filters={perfFilters}
        activeFilters={perfActiveFilters}
        onSelect={perfOnSelect}
        onRemove={perfOnRemove}
        onOpenFilter={perfOnOpenFilter}
        isAdvancedFilter
        askAI
      />
    ) : (
      <Filter.Select
        className="w-full md:w-fit"
        filters={commFilters}
        activeFilters={commActiveFilters}
        onSelect={commOnSelect}
        onRemove={commOnRemove}
        onOpenFilter={commOnOpenFilter}
        onSearchChange={commSetSearch}
        isAdvancedFilter
      />
    );

  const dateRangePicker = (
    <SimpleDateRangePicker align="start" className="w-full md:w-fit" />
  );

  return (
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
      <div className="flex flex-col gap-4 pb-12">
        <div>
          <div className="flex w-full flex-col items-center justify-between gap-2 md:flex-row">
            <div className="flex w-full flex-col items-center gap-2 min-[550px]:flex-row">
              {filterSelect}
              <div className="flex w-full grow items-center gap-2 md:w-auto">
                {dateRangePicker}
                <div className="flex grow justify-end gap-2">
                  {pageTab === "performance" ? (
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
                  ) : (
                    <Link
                      href={`/${slug}/program/commissions${getQueryString({}, { exclude: ["pageTab", "commissionUnit", "event", "saleUnit", "view"] })}`}
                    >
                      <Button
                        variant="secondary"
                        className="w-fit"
                        icon={
                          <SquareLayoutGrid6 className="h-4 w-4 text-neutral-600" />
                        }
                        text={isMobile ? undefined : "View Commissions"}
                      />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div>
            <div
              className={cn(
                "transition-[height] duration-[300ms]",
                pageTab === "performance"
                  ? streaming || perfActiveFilters.length
                    ? "h-3"
                    : "h-0"
                  : commActiveFilters.length
                    ? "h-3"
                    : "h-0",
              )}
            />
            {pageTab === "performance" ? (
              <Filter.List
                filters={perfFilters}
                activeFilters={activeFiltersWithStreaming}
                onSelect={perfOnSelect}
                onRemove={perfOnRemove}
                onRemoveFilter={perfOnRemoveFilter}
                onRemoveAll={perfOnRemoveAll}
                onToggleOperator={perfOnToggleOperator}
                isAdvancedFilter
              />
            ) : (
              <Filter.List
                filters={commFilters}
                activeFilters={commActiveFilters}
                onSelect={commOnSelect}
                onRemove={commOnRemove}
                onRemoveFilter={commOnRemoveFilter}
                onRemoveAll={commOnRemoveAll}
                onToggleOperator={commOnToggleOperator}
                isAdvancedFilter
              />
            )}
          </div>
        </div>

        <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100 sm:rounded-2xl">
          <ProgramAnalyticsNav />
          <div className="border-border-subtle divide-border-subtle -mx-px -mb-px divide-y overflow-hidden rounded-xl border bg-white">
            {children}
          </div>
        </div>

        {pageTab === "performance" ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <PartnerSection />
            <ReferrersUTMs />
            <LocationSection />
            <DeviceSection />
          </div>
        ) : (
          <CommissionsBreakdownCards
            status={commissionStatus}
            queryString={commissionsQueryString}
          />
        )}
      </div>
    </AnalyticsContext.Provider>
  );
}
