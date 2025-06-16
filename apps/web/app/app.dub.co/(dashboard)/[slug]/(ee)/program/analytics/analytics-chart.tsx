import { ANALYTICS_SALE_UNIT } from "@/lib/analytics/constants";
import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import {
  AnalyticsResponseOptions,
  AnalyticsSaleUnit,
} from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { AnalyticsTabs } from "@/ui/analytics/analytics-tabs";
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
import { ProgramAnalyticsContext } from "./page-client";

export function AnalyticsChart() {
  const id = useId();

  const { queryParams, searchParams } = useRouterStuff();

  const { start, end, interval, event, queryString } = useContext(
    ProgramAnalyticsContext,
  );

  const saleUnit: AnalyticsSaleUnit = useMemo(
    () =>
      ANALYTICS_SALE_UNIT.find((u) => u === searchParams.get("saleUnit")) ||
      "saleAmount",
    [searchParams.get("saleUnit")],
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
            event === "sales" && saleUnit === "saleAmount"
              ? d.saleAmount / 100
              : d[event],
        },
      })),
    [data, event, saleUnit],
  );

  const dataLoading = !chartData && !error;

  return (
    <div>
      <div className="border-b border-neutral-200">
        <AnalyticsTabs
          showConversions={true}
          totalEvents={totalEvents}
          tab={event}
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
      <div className="relative mt-4 h-72 p-6 md:h-96">
        {dataLoading ? (
          <div className="flex size-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="flex size-full items-center justify-center text-sm text-neutral-500">
            Failed to load data
          </div>
        ) : (
          <TimeSeriesChart
            key={`${start?.toString}-${end?.toString()}-${interval?.toString()}-${event}`}
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
                        {capitalize(event)}
                      </p>
                    </div>
                    <p className="text-right font-medium text-neutral-900">
                      {event === "sales" && saleUnit === "saleAmount"
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
                event === "sales" && saleUnit === "saleAmount"
                  ? currencyFormatter
                  : nFormatter
              }
            />
            <Areas
              seriesStyles={[
                {
                  id: "saleAmount",
                  areaFill: `url(#${id}-color-gradient)`,
                  lineStroke: `url(#${id}-color-gradient)`,
                  lineClassName: "text-violet-500",
                },
              ]}
            />
          </TimeSeriesChart>
        )}
      </div>
    </div>
  );
}
