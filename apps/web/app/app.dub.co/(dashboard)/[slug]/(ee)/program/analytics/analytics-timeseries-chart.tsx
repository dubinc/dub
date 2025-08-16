import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import {
  Areas,
  ChartContext,
  TimeSeriesChart,
  XAxis,
  YAxis,
} from "@dub/ui/charts";
import { capitalize, currencyFormatter, nFormatter } from "@dub/utils";
import { LinearGradient } from "@visx/gradient";
import { useContext, useId } from "react";

export function AnalyticsTimeseriesChart({
  data,
}: {
  data?: {
    date: Date;
    values: {
      amount: number;
    };
  }[];
}) {
  const id = useId();

  const { start, end, interval, selectedTab, saleUnit } =
    useContext(AnalyticsContext);

  return (
    <TimeSeriesChart
      key={`${start?.toString()}-${end?.toString()}-${interval ?? ""}-${selectedTab}-${saleUnit}`}
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
                  {capitalize(selectedTab)}
                </p>
              </div>
              <p className="text-right font-medium text-neutral-900">
                {selectedTab === "sales" && saleUnit === "saleAmount"
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
        tickFormat={(date) => formatDateTooltip(date, { interval, start, end })}
        maxTicks={2}
      />
      <YAxis
        showGridLines
        tickFormat={
          selectedTab === "sales" && saleUnit === "saleAmount"
            ? currencyFormatter
            : nFormatter
        }
      />
      <Areas />
    </TimeSeriesChart>
  );
}
