import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { EventType } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { cn, currencyFormatter, fetcher, nFormatter } from "@dub/utils";
import { subDays } from "date-fns";
import { Fragment, useContext, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";

const DEMO_DATA = [
  180, 230, 320, 305, 330, 290, 340, 310, 380, 360, 270, 360, 280, 270, 350,
  370, 350, 340, 300,
]
  .reverse()
  .map((value, index) => ({
    date: subDays(new Date(), index),
    values: {
      clicks: value,
      leads: value,
      sales: value,
      saleAmount: value * 19,
    },
  }))
  .reverse();

export default function AnalyticsAreaChart({
  resource,
  demo,
}: {
  resource: EventType;
  demo?: boolean;
}) {
  const { createdAt } = useWorkspace();

  const {
    baseApiPath,
    queryString,
    start,
    end,
    interval,
    saleUnit,
    requiresUpgrade,
  } = useContext(AnalyticsContext);

  const { data } = useSWR<
    {
      start: Date;
      clicks: number;
      leads: number;
      sales: number;
      saleAmount: number;
    }[]
  >(
    !demo &&
      `${baseApiPath}?${editQueryString(queryString, {
        groupBy: "timeseries",
      })}`,
    fetcher,
    {
      shouldRetryOnError: !requiresUpgrade,
    },
  );

  const chartData = useMemo(
    () =>
      demo
        ? DEMO_DATA
        : data?.map(({ start, clicks, leads, sales, saleAmount }) => ({
            date: new Date(start),
            values: {
              clicks,
              leads,
              sales,
              saleAmount: (saleAmount ?? 0) / 100,
            },
          })) ?? null,
    [data, demo],
  );

  const series = [
    {
      id: "clicks",
      valueAccessor: (d) => d.values.clicks,
      isActive: resource === "clicks",
      colorClassName: "text-blue-500",
    },
    {
      id: "leads",
      valueAccessor: (d) => d.values.leads,
      isActive: resource === "leads",
      colorClassName: "text-violet-600",
    },
    {
      id: "sales",
      valueAccessor: (d) => d.values[saleUnit],
      isActive: resource === "sales",
      colorClassName: "text-teal-400",
    },
  ];

  const activeSeries = series.find(({ id }) => id === resource);

  return (
    <div className="flex h-96 w-full items-center justify-center">
      {chartData ? (
        <TimeSeriesChart
          key={queryString}
          data={chartData}
          series={series}
          defaultTooltipIndex={demo ? DEMO_DATA.length - 2 : undefined}
          tooltipClassName="p-0"
          tooltipContent={(d) => {
            return (
              <>
                <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                  {formatDateTooltip(d.date, {
                    interval: demo ? "day" : interval,
                    start,
                    end,
                    dataAvailableFrom: createdAt,
                  })}
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                  <Fragment key={resource}>
                    <div className="flex items-center gap-2">
                      {activeSeries && (
                        <div
                          className={cn(
                            activeSeries.colorClassName,
                            "h-2 w-2 rounded-sm bg-current opacity-50 shadow-[inset_0_0_0_1px_#0003]",
                          )}
                        />
                      )}
                      <p className="capitalize text-neutral-600">{resource}</p>
                    </div>
                    <p className="text-right font-medium text-neutral-900">
                      {resource === "sales" && saleUnit === "saleAmount"
                        ? currencyFormatter(d.values.saleAmount)
                        : nFormatter(d.values[resource], { full: true })}
                    </p>
                  </Fragment>
                </div>
              </>
            );
          }}
        >
          <Areas />
          <XAxis
            tickFormat={(d) =>
              formatDateTooltip(d, {
                interval,
                start,
                end,
                dataAvailableFrom: createdAt,
              })
            }
          />
          <YAxis
            showGridLines
            tickFormat={
              resource === "sales" && saleUnit === "saleAmount"
                ? (v) => `$${nFormatter(v)}`
                : nFormatter
            }
          />
        </TimeSeriesChart>
      ) : (
        <AnalyticsLoadingSpinner />
      )}
    </div>
  );
}
