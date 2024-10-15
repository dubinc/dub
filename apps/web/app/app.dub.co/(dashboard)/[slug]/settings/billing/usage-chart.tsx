import useUsage from "@/lib/swr/use-usage";
import { Bars } from "@/ui/charts/bars";
import TimeSeriesChart from "@/ui/charts/time-series-chart";
import XAxis from "@/ui/charts/x-axis";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

const RESOURCES = ["links", "events", "revenue"] as const;

export function UsageChart() {
  const searchParams = useSearchParams();
  const resource =
    RESOURCES.find((r) => r === searchParams.get("tab")) ?? "links";

  const { usage } = useUsage({ resource: resource as any });

  const chartData = useMemo(
    () =>
      usage?.map(({ date, value }) => ({
        date: new Date(date),
        values: { usage: value },
      })),
    [usage],
  );

  return (
    <div className="h-64">
      {chartData && chartData.length > 0 ? (
        <TimeSeriesChart
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
        >
          <Bars />
          <XAxis />
        </TimeSeriesChart>
      ) : null}
    </div>
  );
}
