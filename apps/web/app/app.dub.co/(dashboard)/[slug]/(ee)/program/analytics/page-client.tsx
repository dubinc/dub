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
import {
  Button,
  Filter,
  SquareLayoutGrid6,
  ToggleGroup,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import Link from "next/link";
import { ContextType, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsChart } from "./analytics-chart";
import { AnalyticsPartnersTable } from "./analytics-partners-table";
import { CommissionsAnalyticsChart } from "./commissions-analytics-chart";
import { CommissionsBreakdownCards } from "./commissions-breakdown-cards";
import { CommissionsPartnersTable } from "./commissions-partners-table";
import { CommissionsStatusSelector } from "./commissions-status-selector";
import { useCommissionsAnalyticsFilters } from "./use-commissions-analytics-filters";
import { useCommissionsAnalyticsQuery } from "./use-commissions-analytics-query";

type PageTab = "performance" | "commissions";

const PAGE_TABS: { id: PageTab; label: string }[] = [
  { id: "performance", label: "Performance" },
  { id: "commissions", label: "Commissions" },
];

export function ProgramAnalyticsPageClient() {
  const { slug, defaultProgramId } = useWorkspace();
  const { program } = useProgram();
  const { searchParamsObj, getQueryString, queryParams } = useRouterStuff();
  const { isMobile } = useMediaQuery();

  const pageTab = useMemo<PageTab>(() => {
    const raw = searchParamsObj.pageTab;
    return raw === "commissions" ? "commissions" : "performance";
  }, [searchParamsObj]);

  const { queryString: commissionsQueryString, status: commissionStatus } =
    useCommissionsAnalyticsQuery();

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
  } = useCommissionsAnalyticsFilters();

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
                    <Link href={`/${slug}/program/commissions`}>
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

        <div className="border-border-subtle divide-border-subtle divide-y overflow-hidden rounded-xl border sm:rounded-2xl">
          <div className="px-2 py-1.5">
            <ToggleGroup
              options={PAGE_TABS.map((t) => ({ value: t.id, label: t.label }))}
              selected={pageTab}
              selectAction={(id) =>
                queryParams({
                  set: { pageTab: id as PageTab },
                  del:
                    id === "performance"
                      ? ["commissionStatus"]
                      : ["event", "saleUnit", "view"],
                  scroll: false,
                })
              }
              className="gap-0.5 border-0 bg-transparent p-0"
              optionClassName="text-xs font-medium px-3 py-1.5"
              indicatorClassName="border-0 bg-neutral-100"
            />
          </div>

          {pageTab === "performance" ? (
            <>
              <AnalyticsChart />
              <AnalyticsPartnersTable />
            </>
          ) : (
            <>
              <CommissionsStatusSelector status={commissionStatus} />
              <div className="relative h-72 md:h-96">
                <div className="relative size-full p-6 pt-10">
                  <CommissionsAnalyticsChart
                    status={commissionStatus}
                    queryString={commissionsQueryString}
                  />
                </div>
              </div>
              <CommissionsPartnersTable queryString={commissionsQueryString} />
            </>
          )}
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
