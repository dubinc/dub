import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import useWorkspace from "@/lib/swr/use-workspace";
import { Combobox, useRouterStuff } from "@dub/ui";
import {
  Areas,
  ChartContext,
  TimeSeriesChart,
  XAxis,
  YAxis,
} from "@dub/ui/charts";
import { LoadingSpinner } from "@dub/ui/icons";
import { currencyFormatter, fetcher, nFormatter } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { LinearGradient } from "@visx/gradient";
import { useContext, useId, useMemo } from "react";
import useSWR from "swr";
import { ProgramAnalyticsContext } from "./page-client";

const chartOptions = [
  { value: "sales", label: "Revenue" },
  { value: "leads", label: "Leads" },
  { value: "clicks", label: "Clicks" },
];

export function AnalyticsChart() {
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const id = useId();

  const { queryParams } = useRouterStuff();

  const { start, end, interval, event } = useContext(ProgramAnalyticsContext);

  const { data, error } = useSWR<
    {
      start: Date;
      clicks: number;
      leads: number;
      sales: number;
      saleAmount: number;
    }[]
  >(
    `/api/analytics?${new URLSearchParams({
      workspaceId: workspaceId!,
      programId: defaultProgramId!,
      event: "composite",
      groupBy: "timeseries",
      ...(start && end
        ? {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
          }
        : { interval: interval ?? DUB_PARTNERS_ANALYTICS_INTERVAL }),
    })}`,
    fetcher,
  );

  const chartData = useMemo(
    () =>
      data?.map((d) => ({
        date: new Date(d.start),
        values: {
          amount: event === "sales" ? d.saleAmount / 100 : d[event],
        },
      })),
    [data, event],
  );

  const total = useMemo(
    () => chartData?.reduce((acc, curr) => acc + curr.values.amount, 0),
    [chartData],
  );

  const dataLoading = !chartData && !error;

  return (
    <div>
      <div>
        <div className="-ml-2 flex justify-between gap-2">
          <Combobox
            selected={chartOptions.find(({ value }) => value === event) || null}
            setSelected={(option) =>
              option && queryParams({ set: { event: option.value } })
            }
            options={chartOptions}
            optionClassName="w-36"
            caret={true}
            hideSearch={true}
            buttonProps={{
              variant: "outline",
              className: "h-7 w-fit px-2 text-content-subtle",
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          {total === undefined ? (
            <div className="h-[45px] w-24 animate-pulse rounded-md bg-neutral-200" />
          ) : (
            <NumberFlow
              value={total}
              className="text-3xl text-neutral-800"
              format={
                event === "sales"
                  ? {
                      style: "currency",
                      currency: "USD",
                    }
                  : undefined
              }
            />
          )}
        </div>
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
                        {
                          chartOptions.find(({ value }) => value === event)
                            ?.label
                        }
                      </p>
                    </div>
                    <p className="text-right font-medium text-neutral-900">
                      {event === "sales"
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
              tickFormat={event === "sales" ? currencyFormatter : nFormatter}
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
