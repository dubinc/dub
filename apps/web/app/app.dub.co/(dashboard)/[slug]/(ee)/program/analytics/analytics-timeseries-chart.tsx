import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { AnalyticsContext } from "@/ui/analytics/analytics-provider";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { capitalize, cn, currencyFormatter, nFormatter } from "@dub/utils";
import { useContext } from "react";

const TAB_COLOR: Record<string, string> = {
  clicks: "text-blue-500",
  leads: "text-violet-600",
  sales: "text-teal-400",
};

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
  const { start, end, interval, selectedTab, saleUnit } =
    useContext(AnalyticsContext);

  const colorClassName = TAB_COLOR[selectedTab] ?? "text-violet-500";

  return (
    <TimeSeriesChart
      key={`${start?.toString()}-${end?.toString()}-${interval ?? ""}-${selectedTab}-${saleUnit}`}
      data={data || []}
      series={[
        {
          id: "amount",
          valueAccessor: (d) => d.values.amount,
          colorClassName,
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
                <div
                  className={cn(
                    colorClassName,
                    "h-2 w-2 rounded-sm bg-current opacity-50 shadow-[inset_0_0_0_1px_#0003]",
                  )}
                />
                <p className="capitalize text-neutral-600">
                  {capitalize(selectedTab)}
                </p>
              </div>
              <p className="text-right font-medium text-neutral-900">
                {selectedTab === "sales" && saleUnit === "saleAmount"
                  ? currencyFormatter(d.values.amount)
                  : nFormatter(d.values.amount, { full: true })}
              </p>
            </div>
          </>
        );
      }}
    >
      <Areas />
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
    </TimeSeriesChart>
  );
}
