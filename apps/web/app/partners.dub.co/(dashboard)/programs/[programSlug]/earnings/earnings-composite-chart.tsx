import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import { LoadingSpinner, useRouterStuff } from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { currencyFormatter } from "@dub/utils";
import { useMemo } from "react";

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

  const [chartData, series] = useMemo(
    () => [
      data?.timeseries?.map(({ start, data }) => ({
        date: new Date(start),
        values: data,
      })),
      data?.timeseries
        ? [
            ...new Set<string>(
              data?.timeseries.flatMap(({ data }) => Object.keys(data)),
            ),
          ]
            .slice(0, MAX_LINES)
            .map((linkId, idx) => ({
              id: linkId,
              isActive: true,
              valueAccessor: (d) => d.values[linkId],
              colorClassName: LINE_COLORS[idx % LINE_COLORS.length],
            }))
        : [],
    ],
    [data],
  );

  return (
    <div className="rounded-lg border border-neutral-200 p-6">
      <div className="h-80">
        {chartData ? (
          <TimeSeriesChart
            data={chartData}
            series={series}
            tooltipClassName="p-0"
            // tooltipContent={(d) => {
            //   return (
            //     <>
            //       <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
            //         {formatDateTooltip(d.date, {
            //           interval: demo ? "day" : interval,
            //           start,
            //           end,
            //           dataAvailableFrom: createdAt,
            //         })}
            //       </p>
            //       <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
            //         <Fragment key={resource}>
            //           <div className="flex items-center gap-2">
            //             {activeSeries && (
            //               <div
            //                 className={cn(
            //                   activeSeries.colorClassName,
            //                   "h-2 w-2 rounded-sm bg-current opacity-50 shadow-[inset_0_0_0_1px_#0003]",
            //                 )}
            //               />
            //             )}
            //             <p className="capitalize text-neutral-600">{resource}</p>
            //           </div>
            //           <p className="text-right font-medium text-neutral-900">
            //             {resource === "sales" && saleUnit === "saleAmount"
            //               ? currencyFormatter(d.values.saleAmount)
            //               : nFormatter(d.values[resource], { full: true })}
            //           </p>
            //         </Fragment>
            //       </div>
            //     </>
            //   );
            // }}
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
