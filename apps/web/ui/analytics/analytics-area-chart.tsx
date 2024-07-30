import { EventType } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import { cn, fetcher, getDaysDifference, nFormatter } from "@dub/utils";
import { Fragment, useCallback, useContext, useMemo } from "react";
import useSWR from "swr";
import Areas from "../charts/areas";
import TimeSeriesChart from "../charts/time-series-chart";
import XAxis from "../charts/x-axis";
import YAxis from "../charts/y-axis";
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
      amount: number;
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
      data?.map(({ start, clicks, leads, sales, amount }) => ({
        date: new Date(start),
        values: {
          clicks,
          leads,
          sales,
          amount: (amount ?? 0) / 100,
        },
      })) ?? null,
    [data],
  );

  const formatDate = useCallback(
    (date: Date) => {
      if (start && end) {
        const daysDifference = getDaysDifference(start, end);

        if (daysDifference <= 2)
          return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
          });
        else if (daysDifference > 180)
          return date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });
      } else if (interval) {
        switch (interval) {
          case "24h":
            return date.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "numeric",
            });
          case "ytd":
          case "1y":
          case "all":
            return date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
          default:
            break;
        }
      }

      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    },
    [start, end, interval],
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
      valueAccessor: (d) => d.values.amount,
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
            const value = d.values[resource === "sales" ? "amount" : resource];
            return (
              <>
                <p className="border-b border-gray-200 px-4 py-3 text-sm text-gray-900">
                  {formatDate(d.date)}
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
                      {resource === "sales" && "$"}
                      {nFormatter(value, { full: true })}
                    </p>
                  </Fragment>
                </div>
              </>
            );
          }}
        >
          <Areas />
          <XAxis tickFormat={formatDate} />
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
