import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { editQueryString } from "@/lib/analytics/utils";
import { AnalyticsFunnelChart } from "@/ui/analytics/analytics-funnel-chart";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { AnalyticsTabs } from "@/ui/analytics/analytics-tabs";
import { ChartViewSwitcher } from "@/ui/analytics/chart-view-switcher";
import { useRouterStuff } from "@dub/ui";
import {
  Areas,
  ChartContext,
  TimeSeriesChart,
  XAxis,
  YAxis,
} from "@dub/ui/charts";
import { LoadingSpinner } from "@dub/ui/icons";
import { capitalize, currencyFormatter, fetcher, nFormatter } from "@dub/utils";
import { LinearGradient } from "@visx/gradient";
import { useContext, useId, useMemo } from "react";
import useSWR from "swr";

export function AnalyticsChart() {
  const id = useId();

  const { queryParams } = useRouterStuff();

  const {
    start,
    end,
    interval,
    selectedTab,
    saleUnit,
    view,
    totalEvents,
    queryString,
  } = useContext(AnalyticsContext);

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
      event: "composite",
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
                <TimeSeriesChart
                  key={`${start?.toString()}-${end?.toString()}-${interval ?? ""}-${selectedTab}-${saleUnit}`}
                  data={chartData || []}
                  series={[
                    {
                      id: "amount",
                      valueAccessor: (d) => d.values.amount,
                      colorClassName: "text-[#8B5CF6]",
                      isActive: true,
                    },
                  ]}
                  tooltipClassName="p-0"
                  tooltipContent={(d) => {
                    return (
                      <>
                        <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                          {formatDateTooltip(d.date, { interval, start, end })}
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-sm bg-violet-500 shadow-[inset_0_0_0_1px_#0003]" />
                            <p className="capitalize text-neutral-600">
                              {capitalize(selectedTab)}
                            </p>
                          </div>
                          <p className="text-right font-medium text-neutral-900">
                            {selectedTab === "sales" &&
                            saleUnit === "saleAmount"
                              ? currencyFormatter(d.values.amount, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : nFormatter(d.values.amount)}
                          </p>
                        </div>
                      </>
                    );
                  }}
                >
                  <ChartContext.Consumer>
                    {(context) => (
                      <LinearGradient
                        id={`${id}-color-gradient`}
                        from="#7D3AEC"
                        to="#DA2778"
                        x1={0}
                        x2={context?.width ?? 1}
                        gradientUnits="userSpaceOnUse"
                      />
                    )}
                  </ChartContext.Consumer>
                  <XAxis
                    tickFormat={(date) =>
                      formatDateTooltip(date, { interval, start, end })
                    }
                  />
                  <YAxis
                    showGridLines
                    tickFormat={
                      selectedTab === "sales" && saleUnit === "saleAmount"
                        ? currencyFormatter
                        : nFormatter
                    }
                  />
                  <Areas />
                </TimeSeriesChart>
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
