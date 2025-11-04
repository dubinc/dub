import { editQueryString } from "@/lib/analytics/utils";
import { AnalyticsFunnelChart } from "@/ui/analytics/analytics-funnel-chart";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { AnalyticsTabs } from "@/ui/analytics/analytics-tabs";
import { ChartViewSwitcher } from "@/ui/analytics/chart-view-switcher";
import { useRouterStuff } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import { useContext, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsTimeseriesChart } from "./analytics-timeseries-chart";

export function AnalyticsChart() {
  const { queryParams } = useRouterStuff();

  const { selectedTab, saleUnit, view, totalEvents, queryString } =
    useContext(AnalyticsContext);

  const { data, error } = useSWR<
    {
      start: Date;
      clicks: number;
      leads: number;
      sales: number;
      saleAmount: number;
    }[]
  >(
    `/api/analytics?${editQueryString(queryString ?? "", {
      event: selectedTab,
      groupBy: "timeseries",
    })}`,
    fetcher,
  );

  const chartData = useMemo(
    () =>
      data?.map((d) => ({
        date: new Date(d.start),
        values: {
          amount:
            selectedTab === "sales" && saleUnit === "saleAmount"
              ? d.saleAmount / 100
              : d[selectedTab],
        },
      })),
    [data, selectedTab, saleUnit],
  );

  const dataLoading = !chartData && !error;

  return (
    <div>
      <div className="border-b border-neutral-200">
        <AnalyticsTabs
          showConversions={true}
          totalEvents={totalEvents}
          tab={selectedTab}
          tabHref={(id) =>
            queryParams({
              set: {
                event: id,
              },
              getNewPath: true,
            }) as string
          }
          saleUnit={saleUnit}
          setSaleUnit={(option) =>
            queryParams({
              set: { saleUnit: option },
            })
          }
        />
      </div>
      <div className="relative h-72 md:h-96">
        {dataLoading ? (
          <div className="flex size-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="flex size-full items-center justify-center text-sm text-neutral-500">
            Failed to load data
          </div>
        ) : (
          <>
            {view === "timeseries" ? (
              <div className="relative size-full p-6 pt-10">
                <AnalyticsTimeseriesChart data={chartData} />
              </div>
            ) : (
              <AnalyticsFunnelChart />
            )}
            <ChartViewSwitcher className="absolute right-3 top-3" />
          </>
        )}
      </div>
    </div>
  );
}
