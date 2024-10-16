import useUsage from "@/lib/swr/use-usage";
import { Bars } from "@/ui/charts/bars";
import TimeSeriesChart from "@/ui/charts/time-series-chart";
import XAxis from "@/ui/charts/x-axis";
import YAxis from "@/ui/charts/y-axis";
import { LoadingSpinner } from "@dub/ui";
import { formatDate, nFormatter } from "@dub/utils";
import { LinearGradient } from "@visx/gradient";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo } from "react";

const RESOURCES = ["links", "events", "revenue"] as const;

export function UsageChart() {
  const searchParams = useSearchParams();
  const resource =
    RESOURCES.find((r) => r === searchParams.get("tab")) ?? "links";

  const { usage, loading } = useUsage({ resource: resource as any });

  const chartData = useMemo(
    () =>
      usage?.map(({ date, value }) => ({
        date: new Date(date),
        values: { usage: resource === "revenue" ? value / 100 : value },
      })),
    [usage, resource],
  );

  return (
    <div className="h-64">
      {chartData && chartData.length > 0 ? (
        <TimeSeriesChart
          key={resource}
          type="bar"
          data={chartData}
          series={[
            {
              id: "usage",
              valueAccessor: (d) => d.values.usage,
              colorClassName: "text-violet-500",
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
                  <Fragment key={resource}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-sm bg-violet-500 shadow-[inset_0_0_0_1px_#0003]" />
                      <p className="capitalize text-gray-600">{resource}</p>
                    </div>
                    <p className="text-right font-medium text-gray-900">
                      {resource === "revenue" && "$"}
                      {nFormatter(d.values.usage, { full: true })}
                    </p>
                  </Fragment>
                </div>
              </>
            );
          }}
        >
          <LinearGradient id="usage-bar-gradient">
            <stop stopColor="#7E3AEA" stopOpacity={1} offset="20%" />
            <stop stopColor="#D8277A" stopOpacity={0} offset="100%" />
          </LinearGradient>
          <Bars
            seriesStyles={[
              {
                id: "usage",
                barFill: "#00000019",
              },
            ]}
          />
          <Bars
            seriesStyles={[
              {
                id: "usage",
                barFill: "url(#usage-bar-gradient)",
              },
            ]}
          />
          <XAxis />
          <YAxis
            showGridLines
            tickFormat={
              resource === "revenue" ? (v) => `$${nFormatter(v)}` : nFormatter
            }
          />
        </TimeSeriesChart>
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-neutral-500">
          {loading ? <LoadingSpinner /> : <p>Failed to load usage data</p>}
        </div>
      )}
    </div>
  );
}
