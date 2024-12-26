import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { EventType } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { cn, fetcher, nFormatter } from "@dub/utils";
import { Fragment, useContext, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";

export default function AnalyticsAreaChart({
  resource,
}: {
  resource: EventType;
}) {
  const { baseApiPath, queryString, start, end, interval, requiresUpgrade } =
    useContext(AnalyticsContext);

  const { data } = useSWR<
    {
      start: Date;
      clicks: number;
      leads: number;
      sales: number;
      saleAmount: number;
    }[]
  >(
    `${baseApiPath}?${editQueryString(queryString, {
      groupBy: "timeseries",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })}`,
    fetcher,
    {
      shouldRetryOnError: !requiresUpgrade,
    },
  );

  const chartData = useMemo(
    () =>
      data?.map(({ start, clicks, leads, sales, saleAmount }) => ({
        date: new Date(start),
        values: {
          clicks,
          leads,
          sales,
          saleAmount: (saleAmount ?? 0) / 100,
        },
      })) ?? null,
    [data],
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
      valueAccessor: (d) => d.values.saleAmount,
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
          tooltipClassName="p-0"
          tooltipContent={(d) => {
            return (
              <>
                <p className="border-b border-gray-200 px-4 py-3 text-sm text-gray-900">
                  {formatDateTooltip(d.date, {
                    interval,
                    start,
                    end,
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
                      <p className="capitalize text-gray-600">{resource}</p>
                    </div>
                    <p className="text-right font-medium text-gray-900">
                      {nFormatter(d.values[resource], { full: true })}
                      {resource === "sales" && (
                        <span className="ml-1 text-gray-500">
                          (
                          {Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            // @ts-ignore – this is a valid option but TS is outdated
                            trailingZeroDisplay: "stripIfInteger",
                          }).format(d.values.saleAmount)}
                          )
                        </span>
                      )}
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
              })
            }
          />
          <YAxis
            showGridLines
            tickFormat={
              resource === "sales" ? (v) => `$${nFormatter(v)}` : nFormatter
            }
          />
        </TimeSeriesChart>
      ) : (
        <AnalyticsLoadingSpinner />
      )}
    </div>
  );
}
