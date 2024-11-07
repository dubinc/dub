import { INTERVAL_DATA, INTERVAL_DISPLAYS } from "@/lib/analytics/constants";
import Areas from "@/ui/charts/areas";
import { ChartContext } from "@/ui/charts/chart-context";
import TimeSeriesChart from "@/ui/charts/time-series-chart";
import XAxis from "@/ui/charts/x-axis";
import YAxis from "@/ui/charts/y-axis";
import { DateRangePicker, useRouterStuff } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { currencyFormatter, formatDate } from "@dub/utils";
import { LinearGradient } from "@visx/gradient";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { useId, useMemo } from "react";

const mockData = () =>
  [...Array(30)].map((_, i) => ({
    date: subDays(new Date(), 30 - i),
    values: {
      earnings: Math.round(Math.random() * 100_00) / 100,
    },
  }));

export function OverviewChart() {
  const { queryParams, searchParams } = useRouterStuff();
  const id = useId();

  // Default to last 24 hours
  const { start, end } = useMemo(() => {
    const hasRange = searchParams?.has("start") && searchParams?.has("end");

    return {
      start: hasRange
        ? startOfDay(
            new Date(searchParams?.get("start") || subDays(new Date(), 1)),
          )
        : undefined,

      end: hasRange
        ? endOfDay(new Date(searchParams?.get("end") || new Date()))
        : undefined,
    };
  }, [searchParams?.get("start"), searchParams?.get("end")]);

  // Only set interval if start and end are not provided
  const interval =
    start || end ? undefined : searchParams?.get("interval") ?? "24h";

  // TODO: [payouts] use actual data (note: this mock data is already divided by 100)
  const total = 1234_00;
  const data = useMemo(() => mockData(), [start, end, interval]);

  const dataError = null;
  const totalError = null;

  const dataLoading = !data && !dataError;
  const totalLoading = total === undefined && !totalError;

  return (
    <div>
      <div className="flex justify-between">
        <div className="flex flex-col gap-1 p-2">
          <span className="text-sm text-neutral-500">Revenue</span>
          {totalLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-neutral-200" />
          ) : (
            <span className="text-3xl text-neutral-800">
              {totalError
                ? "-"
                : currencyFormatter(total / 100, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
            </span>
          )}
        </div>
        <div>
          <DateRangePicker
            className="h-9 w-full px-2 md:w-fit"
            align="end"
            value={
              start && end
                ? {
                    from: start,
                    to: end,
                  }
                : undefined
            }
            presetId={!start || !end ? interval ?? "24h" : undefined}
            onChange={(range, preset) => {
              if (preset) {
                queryParams({
                  del: ["start", "end"],
                  set: {
                    interval: preset.id,
                  },
                  scroll: false,
                });

                return;
              }

              // Regular range
              if (!range || !range.from || !range.to) return;

              queryParams({
                del: "interval",
                set: {
                  start: range.from.toISOString(),
                  end: range.to.toISOString(),
                },
                scroll: false,
              });
            }}
            presets={INTERVAL_DISPLAYS.map(({ display, value, shortcut }) => {
              const start = INTERVAL_DATA[value].startDate;
              const end = new Date();

              return {
                id: value,
                label: display,
                dateRange: {
                  from: start,
                  to: end,
                },
                shortcut,
              };
            })}
          />
        </div>
      </div>
      <div className="relative mt-4 h-72 md:h-96">
        {dataLoading ? (
          <div className="flex size-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <TimeSeriesChart
            data={data}
            series={[
              {
                id: "earnings",
                valueAccessor: (d) => d.values.earnings,
                colorClassName: "text-[#8B5CF6]",
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
                      <div className="h-2 w-2 rounded-sm bg-violet-500 shadow-[inset_0_0_0_1px_#0003]" />
                      <p className="capitalize text-gray-600">Revenue</p>
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
                  from="#8B5CF6"
                  to="#4C1D95"
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
