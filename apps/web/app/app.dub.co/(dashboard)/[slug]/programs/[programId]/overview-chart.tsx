import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import useProgramRevenue from "@/lib/swr/use-program-analytics";
import useProgramMetrics from "@/lib/swr/use-program-metrics";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { useRouterStuff } from "@dub/ui";
import {
  Areas,
  ChartContext,
  TimeSeriesChart,
  XAxis,
  YAxis,
} from "@dub/ui/charts";
import { LoadingSpinner } from "@dub/ui/icons";
import { currencyFormatter } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { LinearGradient } from "@visx/gradient";
import { useId, useMemo } from "react";

export function OverviewChart() {
  const id = useId();
  const { searchParamsObj } = useRouterStuff();

  const {
    start,
    end,
    interval = DUB_PARTNERS_ANALYTICS_INTERVAL,
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
  };

  const { metrics } = useProgramMetrics();

  const { data: timeseries, error } = useProgramRevenue({
    event: "sales",
    groupBy: "timeseries",
    interval,
    start: start ? new Date(start) : undefined,
    end: end ? new Date(end) : undefined,
  });

  const data = useMemo(
    () =>
      timeseries?.map(({ start, saleAmount }) => ({
        date: new Date(start),
        values: { saleAmount: saleAmount / 100 },
      })),
    [timeseries],
  );

  const dataLoading = !data && !error;

  return (
    <div>
      <div className="flex justify-between">
        <div className="flex flex-col gap-1 p-2">
          <span className="text-sm text-neutral-500">Revenue</span>
          {!metrics ? (
            <div className="h-11 w-24 animate-pulse rounded-md bg-neutral-200" />
          ) : (
            <NumberFlow
              value={metrics.revenue / 100}
              className="text-3xl text-neutral-800"
              format={{
                style: "currency",
                currency: "USD",
              }}
            />
          )}
        </div>
        <SimpleDateRangePicker className="h-9 w-full px-2 md:w-fit" />
      </div>
      <div className="relative mt-4 h-72 md:h-96">
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
            key={`${start?.toString}-${end?.toString()}-${interval?.toString()}`}
            data={data}
            series={[
              {
                id: "saleAmount",
                valueAccessor: (d) => d.values.saleAmount,
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
                      <p className="capitalize text-neutral-600">Revenue</p>
                    </div>
                    <p className="text-right font-medium text-neutral-900">
                      {currencyFormatter(d.values.saleAmount, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
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
            <YAxis showGridLines tickFormat={currencyFormatter} />
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
