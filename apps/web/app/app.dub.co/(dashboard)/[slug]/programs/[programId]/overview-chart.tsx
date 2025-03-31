import { DUB_PARTNERS_ANALYTICS_INTERVAL } from "@/lib/analytics/constants";
import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import useProgramEarnings from "@/lib/swr/use-program-earnings";
import useProgramMetrics from "@/lib/swr/use-program-metrics";
import useProgramRevenue from "@/lib/swr/use-program-revenue";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Combobox, useRouterStuff } from "@dub/ui";
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
import { useId, useMemo, useState } from "react";

const chartOptions = [
  { value: "revenue", label: "Revenue" },
  { value: "earnings", label: "Commissions" },
];

type ViewType = "revenue" | "earnings";

export function OverviewChart() {
  const id = useId();
  const { searchParamsObj } = useRouterStuff();
  const [viewType, setViewType] = useState<ViewType>("revenue");

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

  const { data: revenue, error: revenueError } = useProgramRevenue({
    event: "sales",
    groupBy: "timeseries",
    interval,
    start: start ? new Date(start) : undefined,
    end: end ? new Date(end) : undefined,
    enabled: viewType === "revenue",
  });

  const { data: earnings, error: earningsError } = useProgramEarnings({
    event: "sales",
    groupBy: "timeseries",
    interval,
    start: start ? new Date(start) : undefined,
    end: end ? new Date(end) : undefined,
    enabled: viewType === "earnings",
  });

  const data = useMemo(() => {
    const sourceData = viewType === "revenue" ? revenue : earnings;

    return sourceData?.map(({ start, saleAmount, earnings }) => ({
      date: new Date(start),
      values: {
        amount: (viewType === "revenue" ? saleAmount : earnings) / 100,
      },
    }));
  }, [revenue, earnings, viewType]);

  const dataLoading = !data && !revenueError && !earningsError;
  const error = revenueError || earningsError;

  return (
    <div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-2">
          <Combobox
            selected={
              chartOptions.find((opt) => opt.value === viewType) || null
            }
            setSelected={(option) =>
              option && setViewType(option.value as ViewType)
            }
            options={chartOptions}
            caret={true}
            hideSearch={true}
            buttonProps={{
              className: "h-9 w-36 border-neutral-200 bg-white text-sm",
            }}
          />

          <SimpleDateRangePicker className="h-9 w-full px-2 md:w-fit" />
        </div>

        <div className="flex flex-col gap-1 p-2">
          {!metrics ? (
            <div className="h-11 w-24 animate-pulse rounded-md bg-neutral-200" />
          ) : (
            <NumberFlow
              value={metrics[viewType] / 100}
              className="text-3xl text-neutral-800"
              format={{
                style: "currency",
                currency: "USD",
              }}
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
            key={`${start?.toString}-${end?.toString()}-${interval?.toString()}-${viewType}`}
            data={data || []}
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
                        {viewType === "revenue" ? "Revenue" : "Commissions"}
                      </p>
                    </div>
                    <p className="text-right font-medium text-neutral-900">
                      {currencyFormatter(d.values.amount, {
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
