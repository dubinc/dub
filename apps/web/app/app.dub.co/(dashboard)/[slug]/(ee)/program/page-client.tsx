"use client";

import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { AnalyticsResponseOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { CommissionsBlock } from "@/ui/partners/overview/blocks/commissions-block";
import { ConversionBlock } from "@/ui/partners/overview/blocks/conversion-block";
import { CountriesBlock } from "@/ui/partners/overview/blocks/countries-block";
import { LinksBlock } from "@/ui/partners/overview/blocks/links-block";
import { PartnersBlock } from "@/ui/partners/overview/blocks/partners-block";
import { TrafficSourcesBlock } from "@/ui/partners/overview/blocks/traffic-sources-block";
import { ProgramOverviewCard } from "@/ui/partners/overview/program-overview-card";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import { OverviewChart } from "./overview-chart";
import { OverviewLinks } from "./overview-links";
import { OverviewTasks } from "./overview-tasks";

const BLOCKS = [
  PartnersBlock,
  TrafficSourcesBlock,
  CommissionsBlock,
  ConversionBlock,
  CountriesBlock,
  LinksBlock,
];

export default function ProgramOverviewPageClient() {
  const { searchParamsObj } = useRouterStuff();

  const { defaultProgramId, id: workspaceId } = useWorkspace();

  const { start, end, interval } = useMemo(() => {
    const { event, ...rest } = searchParamsObj;
    return {
      interval: DUB_PARTNERS_ANALYTICS_INTERVAL,
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
          selectedTab: "sales",
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
            <OverviewLinks />
          </div>
        </div>
        <div className="@2xl:grid-cols-2 @4xl:grid-cols-3 grid grid-cols-1 gap-6">
          {BLOCKS.map((Block, idx) => (
            <Block key={idx} />
          ))}
        </div>
      </AnalyticsContext.Provider>
    </div>
  );
}
