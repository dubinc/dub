"use client";

import { IntervalOptions } from "@/lib/analytics/types";
import Areas from "@/ui/charts/areas";
import { ChartContext } from "@/ui/charts/chart-context";
import TimeSeriesChart from "@/ui/charts/time-series-chart";
import XAxis from "@/ui/charts/x-axis";
import YAxis from "@/ui/charts/y-axis";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { cn, currencyFormatter, formatDate } from "@dub/utils";
import { LinearGradient } from "@visx/gradient";
import { createContext, useId, useMemo } from "react";

export const ProgramOverviewContext = createContext<{
  start?: Date;
  end?: Date;
  interval?: IntervalOptions;
  color?: string;
}>({});

interface EarningsChartProps {
  timeseries: any;
  total: any;
  color: any;
  error: any;
}

export function EarningsChart({
  timeseries,
  total,
  color,
  error,
}: EarningsChartProps) {
  const id = useId();

  const data = useMemo(
    () =>
      timeseries?.map(({ start, earnings }) => ({
        date: new Date(start),
        values: { earnings: earnings / 100 },
      })),
    [timeseries],
  );

  return (
    <div>
      <div className="flex flex-col-reverse items-start justify-between gap-4 md:flex-row">
        <div>
          <span className="block text-sm text-neutral-500">Earnings</span>
          <div className="mt-1.5">
            {total !== undefined ? (
              <span className="text-2xl leading-none text-neutral-800">
                {currencyFormatter(total / 100, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            ) : (
              <div className="h-7 w-24 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
        <div className="w-full md:w-auto">
          <SimpleDateRangePicker className="h-8 w-full md:w-fit" />
        </div>
      </div>
      <div className="relative mt-4 h-64 w-full">
        {data ? (
          <TimeSeriesChart
            data={data}
            series={[
              {
                id: "earnings",
                valueAccessor: (d) => d.values.earnings,
                colorClassName: color ? `text-[${color}]` : "text-violet-500",
                isActive: true,
              },
            ]}
            tooltipClassName="p-0"
            tooltipContent={(d) => {
              return (
                <>
                  <p className="border-b border-gray-200 px-4 py-3 text-sm text-gray-900">
                    {formatDate(d.date)}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-sm shadow-[inset_0_0_0_1px_#0003]",
                          color ? `bg-[${color}]` : "bg-violet-500",
                        )}
                      />
                      <p className="capitalize text-gray-600">Earnings</p>
                    </div>
                    <p className="text-right font-medium text-gray-900">
                      {currencyFormatter(d.values.earnings, {
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
                  from={color || "#7D3AEC"}
                  to={color || "#DA2778"}
                  x1={0}
                  x2={context?.width ?? 1}
                  gradientUnits="userSpaceOnUse"
                />
              )}
            </ChartContext.Consumer>

            <XAxis />
            <YAxis showGridLines />
            <Areas
              seriesStyles={[
                {
                  id: "earnings",
                  areaFill: `url(#${id}-color-gradient)`,
                  lineStroke: `url(#${id}-color-gradient)`,
                  lineClassName: `text-[${color}]`,
                },
              ]}
            />
          </TimeSeriesChart>
        ) : (
          <div className="flex size-full items-center justify-center">
            {error ? (
              <span className="text-sm text-neutral-500">
                Failed to load earnings data.
              </span>
            ) : (
              <LoadingSpinner />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
