import useUsage from "@/lib/swr/use-usage";
import { Bars } from "@/ui/charts/bars";
import TimeSeriesChart from "@/ui/charts/time-series-chart";
import XAxis from "@/ui/charts/x-axis";
import YAxis from "@/ui/charts/y-axis";
import { EmptyState } from "@dub/blocks/src/empty-state";
import { LoadingSpinner } from "@dub/ui";
import { CircleDollar, CursorRays, Hyperlink } from "@dub/ui/src/icons";
import { formatDate, nFormatter } from "@dub/utils";
import { LinearGradient } from "@visx/gradient";
import { useSearchParams } from "next/navigation";
import { ComponentProps, Fragment, useMemo } from "react";

const RESOURCES = ["links", "events", "revenue"] as const;
const resourceEmptyStates: Record<
  (typeof RESOURCES)[number],
  ComponentProps<typeof EmptyState>
> = {
  links: {
    icon: Hyperlink,
    title: "Links Created",
    description:
      "No short links have been created in the current billing cycle.",
  },
  events: {
    icon: CursorRays,
    title: "Events Tracked",
    description: "No events have been tracked in the current billing cycle.",
  },
  revenue: {
    icon: CircleDollar,
    title: "Revenue Tracked",
    description: "No revenue has been tracked in the current billing cycle.",
  },
};

export function UsageChart() {
  const searchParams = useSearchParams();
  const resource =
    RESOURCES.find((r) => r === searchParams.get("tab")) ?? "links";

  const { usage, loading } = useUsage({ resource });

  const chartData = useMemo(
    () =>
      usage?.map(({ date, value }) => ({
        date: new Date(date),
        values: { usage: resource === "revenue" ? value / 100 : value },
      })),
    [usage, resource],
  );

  const allZeroes = useMemo(
    () => chartData?.every(({ values }) => values.usage === 0),
    [chartData],
  );

  return (
    <div className="h-64">
      {chartData && chartData.length > 0 ? (
        !allZeroes ? (
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
              <stop stopColor="#2563eb" stopOpacity={1} offset="20%" />
              <stop stopColor="#3b82f6" stopOpacity={0.9} offset="100%" />
            </LinearGradient>
            <XAxis highlightLast={false} />
            <YAxis
              showGridLines
              tickFormat={
                resource === "revenue" ? (v) => `$${nFormatter(v)}` : nFormatter
              }
            />
            <Bars
              seriesStyles={[
                {
                  id: "usage",
                  barFill: "url(#usage-bar-gradient)",
                },
              ]}
            />
          </TimeSeriesChart>
        ) : (
          <div className="flex size-full items-center justify-center">
            <EmptyState {...resourceEmptyStates[resource]} />
          </div>
        )
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-neutral-500">
          {loading ? <LoadingSpinner /> : <p>Failed to load usage data</p>}
        </div>
      )}
    </div>
  );
}
