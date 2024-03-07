import { fetcher } from "@dub/utils";
import { useContext, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsContext } from ".";
import AreaChart from "../charts/area-chart";

export default function ClicksChart() {
  const { baseApiPath, queryString /* interval */ } =
    useContext(AnalyticsContext);

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

  return (
    <div className="h-72 w-full">
      {chartData !== null && (
        <AreaChart
          data={chartData}
          series={[{ id: "clicks", accessorFn: (d) => d.values.clicks }]}
          tooltipContent={(d) => (
            <>
              <p className="text-gray-600">
                <strong className="text-gray-700">{d.values.clicks}</strong>{" "}
                clicks
              </p>
              <p className="text-sm text-gray-400">
                {d.date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </>
          )}
        />
      )}
    </div>
  );
}
