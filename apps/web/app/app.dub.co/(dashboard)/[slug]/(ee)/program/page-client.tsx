"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { AnalyticsResponseOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { ProgramOverviewCard } from "@/ui/partners/program-overview-card";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import { OverviewChart } from "./overview-chart";
import { OverviewTasks } from "./overview-tasks";

export default function ProgramOverviewPageClient() {
  const { program } = useProgram();
  const { searchParamsObj } = useRouterStuff();

  const { defaultProgramId, id: workspaceId } = useWorkspace();

  const { start, end, interval, selectedTab } = useMemo(() => {
    const { event, ...rest } = searchParamsObj;
    return {
      interval: DUB_PARTNERS_ANALYTICS_INTERVAL,
      selectedTab: event || "sales",
      ...rest,
    } as Record<string, any>;
  }, [searchParamsObj]);

  const queryString = new URLSearchParams({
    programId: defaultProgramId ?? "",
    workspaceId: workspaceId ?? "",
    ...(start &&
      end && {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
      }),
    ...(interval && { interval: interval.toString() }),
  }).toString();

  const { data: totalEvents } = useSWR<{
    [key in AnalyticsResponseOptions]: number;
  }>(
    `/api/analytics?${editQueryString(queryString, {
      event: "composite",
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <div className="@container flex flex-col gap-6">
      <SimpleDateRangePicker align="start" className="w-fit" />
      <AnalyticsContext.Provider
        value={{
          basePath: "",
          baseApiPath: "/api/analytics",
          selectedTab,
          saleUnit: "saleAmount",
          view: "timeseries",
          queryString,
          start: start ? new Date(start) : undefined,
          end: end ? new Date(end) : undefined,
          interval: interval as string | undefined,
          totalEvents,
        }}
      >
        <div className="@4xl:grid-cols-[minmax(0,1fr)_400px] grid grid-cols-1 gap-6 rounded-2xl bg-neutral-100 p-4">
          {/* Chart */}
          <ProgramOverviewCard className="@4xl:h-full h-96 p-6">
            <OverviewChart />
          </ProgramOverviewCard>

          <div className="@4xl:grid-cols-1 @2xl:grid-cols-2 grid grid-cols-1 gap-6">
            {/* Tasks */}
            <OverviewTasks />

            {/* Program links */}
            <div className="border-border-subtle h-48 rounded-[0.625rem] border bg-white"></div>
          </div>
        </div>
        <div className="@2xl:grid-cols-2 @4xl:grid-cols-3 grid grid-cols-1 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div
              key={idx}
              className="border-border-subtle h-64 rounded-[0.625rem] border bg-white"
            ></div>
          ))}
        </div>
      </AnalyticsContext.Provider>
      {/* <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <TopPartners />
        <PendingPayouts />
      </div> */}
    </div>
  );
}
