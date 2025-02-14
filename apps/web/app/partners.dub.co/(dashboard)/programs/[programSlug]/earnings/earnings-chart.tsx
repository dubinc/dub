import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { IntervalOptions } from "@/lib/analytics/types";
import { usePartnerEarnings } from "@/lib/swr/use-partner-earnings";
import { LoadingSpinner, useRouterStuff } from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { currencyFormatter } from "@dub/utils";
import { useMemo } from "react";

export function EarningsChart() {
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

  const { data: timeseries } = usePartnerEarnings({
    interval,
    start: start ? new Date(start) : undefined,
    end: end ? new Date(end) : undefined,
  });

  const series = [
    {
      id: "clicks",
      isActive: true,
      valueAccessor: (d) => d.values.clicks,
      colorClassName: "text-blue-500",
    },
    {
      id: "leads",
      isActive: true,
      valueAccessor: (d) => d.values.leads,
      colorClassName: "text-violet-600",
    },
    {
      id: "sales",
      isActive: true,
      valueAccessor: (d) => d.values.sales,
      colorClassName: "text-teal-400",
    },
  ];

  const chartData = useMemo(() => {
    return timeseries?.map((item) => ({
      date: new Date(item.start),
      values: {
        clicks: item.click,
        leads: item.lead,
        sales: item.sale,
      },
    }));
  }, [timeseries]);

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
