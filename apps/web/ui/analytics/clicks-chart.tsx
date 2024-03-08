import { fetcher } from "@dub/utils";
import { useCallback, useContext, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsContext } from ".";
import AreaChart from "../charts/area-chart";

export default function ClicksChart() {
  const { baseApiPath, queryString, interval } = useContext(AnalyticsContext);

  const { data } = useSWR<{ start: Date; clicks: number }[]>(
    `${baseApiPath}/timeseries?${queryString}`,
    fetcher,
  );

  const chartData = useMemo(
    () =>
      data?.map(({ start, clicks }) => ({
        date: new Date(start),
        values: { clicks },
      })) ?? null,
    [data],
  );

  const dateFormatter = useCallback(
    (date: Date) => {
      if (interval.endsWith("h")) {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: interval === "1h" ? "numeric" : undefined,
        });
      }

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    },
    [interval],
  );

  return (
    <div className="h-72 w-full">
      {chartData !== null && (
        <AreaChart
          data={chartData}
          series={[{ id: "clicks", accessorFn: (d) => d.values.clicks }]}
          tickFormat={dateFormatter}
          tooltipContent={(d) => (
            <>
              <p className="text-gray-600">
                <strong className="text-gray-700">{d.values.clicks}</strong>{" "}
                clicks
              </p>
              <p className="text-sm text-gray-400">{dateFormatter(d.date)}</p>
            </>
          )}
        />
      )}
    </div>
  );
}
