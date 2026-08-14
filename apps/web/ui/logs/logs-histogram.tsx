"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { useApiLogsTimeseries } from "@/lib/swr/use-api-logs-timeseries";
import { LoadingSpinner, useRouterStuff } from "@dub/ui";
import { Bars, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { cn, nFormatter } from "@dub/utils";
import { useMemo } from "react";

const SERIES = [
  {
    id: "status2xx",
    label: "2xx",
    colorClassName: "text-content-success",
  },
  {
    id: "status4xx",
    label: "4xx",
    colorClassName: "text-content-warning",
  },
  {
    id: "status5xx",
    label: "5xx",
    colorClassName: "text-content-error",
  },
  {
    id: "statusOther",
    label: "Other",
    colorClassName: "text-content-subtle",
  },
] as const;

type HistogramValues = {
  status2xx: number;
  status4xx: number;
  status5xx: number;
  statusOther: number;
};

export function LogsHistogram() {
  const { data, error, isLoading } = useApiLogsTimeseries();
  const { queryParams, searchParamsObj } = useRouterStuff();
  const { start, end, interval } = searchParamsObj;

  const chartData = useMemo(
    () =>
      data?.map((row) => ({
        date: new Date(row.date),
        values: {
          status2xx: row.status2xx,
          status4xx: row.status4xx,
          status5xx: row.status5xx,
          statusOther: row.statusOther,
        } satisfies HistogramValues,
      })),
    [data],
  );

  const showOther = useMemo(
    () => Boolean(chartData?.some((d) => d.values.statusOther > 0)),
    [chartData],
  );

  const series = useMemo(
    () =>
      SERIES.filter((s) => s.id !== "statusOther" || showOther).map((s) => ({
        id: s.id,
        valueAccessor: (d: { values: HistogramValues }) => d.values[s.id],
        colorClassName: s.colorClassName,
        isActive: true,
      })),
    [showOther],
  );

  const isAllZero = Boolean(
    chartData?.every(
      (d) =>
        d.values.status2xx +
          d.values.status4xx +
          d.values.status5xx +
          d.values.statusOther ===
        0,
    ),
  );

  return (
    <div className="h-40 w-full">
      {chartData && chartData.length > 0 && !isAllZero ? (
        <TimeSeriesChart
          type="bar"
          data={chartData}
          series={series}
          tooltipClassName="p-0 overflow-hidden"
          onXValueClick={(d) => {
            const bucketMs =
              chartData.length >= 2
                ? chartData[1].date.getTime() - chartData[0].date.getTime()
                : 60 * 60 * 1000;

            // exactRange skips day-snapping so this hour/day bucket is not
            // expanded to a full calendar day on the server.
            queryParams({
              del: ["interval", "page"],
              set: {
                start: d.date.toISOString(),
                end: new Date(d.date.getTime() + bucketMs).toISOString(),
                exactRange: "1",
              },
            });
          }}
          tooltipContent={(d) => {
            const total =
              d.values.status2xx +
              d.values.status4xx +
              d.values.status5xx +
              d.values.statusOther;

            const rows = SERIES.filter(
              (s) => s.id !== "statusOther" || d.values.statusOther > 0,
            );

            return (
              <>
                <div className="flex items-center justify-between gap-4 px-4 py-3 text-xs">
                  <span className="text-content-emphasis font-semibold">
                    {formatDateTooltip(d.date, { interval, start, end })}
                  </span>
                  <span className="text-content-default font-medium">
                    {nFormatter(total, { full: true })}
                  </span>
                </div>
                <div className="border-border-subtle grid grid-cols-[minmax(0,1fr),min-content] gap-x-6 gap-y-2 border-t px-4 py-3 text-xs">
                  {rows.map((s) => (
                    <div key={s.id} className="contents">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "size-2 shrink-0 rounded-sm bg-current",
                            s.colorClassName,
                          )}
                        />
                        <span className="text-neutral-600">{s.label}</span>
                      </div>
                      <span className="text-right font-medium text-neutral-900">
                        {nFormatter(d.values[s.id], { full: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            );
          }}
        >
          <XAxis
            highlightLast={false}
            tickFormat={(d) => formatDateTooltip(d, { interval, start, end })}
          />
          <YAxis showGridLines tickFormat={nFormatter} />
          <Bars />
        </TimeSeriesChart>
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-neutral-500">
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <p>Failed to load</p>
          ) : (
            <p>No requests in this range</p>
          )}
        </div>
      )}
    </div>
  );
}
