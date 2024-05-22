import { fetcher, getDaysDifference, nFormatter } from "@dub/utils";
import { useCallback, useContext, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsContext } from ".";
import Areas from "../charts/areas";
import TimeSeriesChart from "../charts/time-series-chart";
import XAxis from "../charts/x-axis";
import YAxis from "../charts/y-axis";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";

export default function ClicksChart({
  show,
}: {
  show: ("clicks" | "leads" | "sales")[];
}) {
  const { baseApiPath, queryString, start, end, requiresUpgrade } =
    useContext(AnalyticsContext);

  const { data } = useSWR<{ start: Date; clicks: number }[]>(
    `${baseApiPath}/clicks/timeseries?${queryString}`,
    fetcher,
    {
      shouldRetryOnError: !requiresUpgrade,
    },
  );

  const chartData = useMemo(
    () =>
      data?.map(({ start, clicks }) => ({
        date: new Date(start),
        values: { clicks, leads: clicks, sales: clicks }, // TODO: Update these accessors once we have leads and sales data
      })) ?? null,
    [data],
  );

  const formatDate = useCallback(
    (date: Date) => {
      const daysDifference = getDaysDifference(start, end);

      if (daysDifference <= 2)
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

  const series = [
    {
      id: "clicks",
      valueAccessor: (d) => d.values.clicks,
      isActive: show.includes("clicks"),
    },
    {
      id: "leads",
      valueAccessor: (d) => d.values.leads,
      isActive: show.includes("leads"),
    },
    {
      id: "sales",
      valueAccessor: (d) => d.values.sales,
      isActive: show.includes("sales"),
    },
  ];

  return (
    <div className="flex h-96 w-full items-center justify-center">
      {chartData ? (
        <TimeSeriesChart
          key={queryString}
          data={chartData}
          series={series}
          tooltipContent={(d) => (
            <>
              {show.map((resource) => {
                const value = d.values[resource];
                return (
                  <p className="text-gray-700">
                    <strong className="text-gray-800">
                      {nFormatter(value, { full: true })}
                    </strong>{" "}
                    {value === 1 ? resource.slice(0, -1) : resource}
                  </p>
                );
              })}
              <p className="text-sm text-gray-500">{formatDate(d.date)}</p>
            </>
          )}
        >
          <Areas />
          <XAxis tickFormat={formatDate} />
          <YAxis showGridLines tickFormat={nFormatter} />
        </TimeSeriesChart>
      ) : (
        <AnalyticsLoadingSpinner />
      )}
    </div>
  );
}
