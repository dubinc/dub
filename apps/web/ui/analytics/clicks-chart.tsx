import { LoadingSpinner } from "@dub/ui";
import { fetcher, getDaysDifference, nFormatter } from "@dub/utils";
import { useCallback, useContext, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsContext } from ".";
import Areas from "../charts/areas";
import TimeSeriesChart from "../charts/time-series-chart";
import XAxis from "../charts/x-axis";
import YAxis from "../charts/y-axis";

export default function ClicksChart() {
  const { baseApiPath, queryString, start, end } = useContext(AnalyticsContext);

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

  const formatDate = useCallback(
    (date: Date) => {
      const daysDifference = getDaysDifference(start, end);

      if (daysDifference <= 1)
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
        });
      else if (daysDifference > 180)
        return date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    },
    [start, end],
  );

  return (
    <div className="flex h-96 w-full items-center justify-center">
      {chartData ? (
        <TimeSeriesChart
          key={queryString}
          data={chartData}
          series={[{ id: "clicks", valueAccessor: (d) => d.values.clicks }]}
          tooltipContent={(d) => (
            <>
              <p className="text-gray-700">
                <strong className="text-gray-800">
                  {nFormatter(d.values.clicks, { full: true })}
                </strong>{" "}
                clicks
              </p>
              <p className="text-sm text-gray-500">{formatDate(d.date)}</p>
            </>
          )}
        >
          <Areas />
          <XAxis tickFormat={formatDate} />
          <YAxis showGridLines tickFormat={nFormatter} />
        </TimeSeriesChart>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );
}
