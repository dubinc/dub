import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import { LoadingSpinner, useRouterStuff } from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { cn, currencyFormatter, getPrettyUrl } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Fragment, useMemo } from "react";

const LINE_COLORS = [
  "text-teal-500",
  "text-purple-500",
  "text-blue-500",
  "text-green-500",
  "text-orange-500",
  "text-yellow-500",
];

const MAX_LINES = LINE_COLORS.length;

export function EarningsCompositeChart() {
  const { searchParamsObj } = useRouterStuff();

  const {
    start,
    end,
    interval = "1y",
  } = searchParamsObj as {
    start?: string;
    end?: string;
    interval?: IntervalOptions;
  };

  const { data } = usePartnerEarningsTimeseries({
    interval,
    groupBy: "linkId",
    start: start ? new Date(start) : undefined,
    end: end ? new Date(end) : undefined,
  });

  const total = useMemo(
    () => data?.timeseries?.reduce((acc, { earnings }) => acc + earnings, 0),
    [data],
  );

  const [chartData, series] = useMemo(
    () => [
      data?.timeseries?.map(({ start, earnings, data }) => ({
        date: new Date(start),
        values: { ...data, total: earnings },
      })),
      data?.timeseries
        ? [
            ...new Set<string>(
              data.timeseries.flatMap(({ data }) => Object.keys(data)),
            ),
          ]
            // Sort by total earnings for the period
            .sort((a, b) => {
              const [earningsA, earningsB] = data.timeseries.reduce(
                (acc, { data }) => [acc[0] + data[a], acc[1] + data[b]],
                [0, 0],
              );
              return earningsB - earningsA;
            })
            .slice(0, MAX_LINES)
            .map((linkId, idx) => ({
              id: linkId,
              isActive: true,
              valueAccessor: (d) => (d.values[linkId] || 0) / 100,
              colorClassName: LINE_COLORS[idx % LINE_COLORS.length],
            }))
        : [],
    ],
    [data],
  );

  return (
    <div className="rounded-lg border border-neutral-200 p-6">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-neutral-500">Total Earnings</span>
        <div className="mt-1">
          {total !== undefined ? (
            <NumberFlow
              className="text-lg font-medium leading-none text-neutral-800"
              value={total / 100}
              format={{
                style: "currency",
                currency: "USD",
                // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                trailingZeroDisplay: "stripIfInteger",
              }}
            />
          ) : (
            <div className="h-[27px] w-24 animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
      </div>
      <div className="mt-5 h-80">
        {chartData ? (
          <TimeSeriesChart
            data={chartData}
            series={series}
            tooltipClassName="p-0"
            tooltipContent={(d) => {
              return (
                <>
                  <div className="flex justify-between border-b border-neutral-200 p-3 text-xs">
                    <p className="font-medium leading-none text-neutral-900">
                      {formatDateTooltip(d.date, {
                        interval,
                        start,
                        end,
                      })}
                    </p>
                    <p className="text-right leading-none text-neutral-500">
                      {currencyFormatter((d.values.total || 0) / 100, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="grid max-w-64 grid-cols-[minmax(0,1fr),min-content] gap-x-6 gap-y-2 px-4 py-3 text-xs">
                    {series.map(({ id, colorClassName, valueAccessor }) => {
                      const link = data?.links?.find((l) => l.id === id);
                      return (
                        <Fragment key={id}>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                colorClassName,
                                "size-2 shrink-0 rounded-sm bg-current opacity-50 shadow-[inset_0_0_0_1px_#0003]",
                              )}
                            />
                            <span className="min-w-0 truncate font-medium text-neutral-700">
                              {link?.shortLink
                                ? getPrettyUrl(link.shortLink)
                                : "Short link"}
                            </span>
                          </div>
                          <p className="text-right text-neutral-500">
                            {currencyFormatter(valueAccessor(d), {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </Fragment>
                      );
                    })}
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
              tickFormat={(v) => `${currencyFormatter(v)}`}
            />
          </TimeSeriesChart>
        ) : (
          <div className="flex size-full items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </div>
  );
}
