import { cn, fetcher, getDaysDifference, nFormatter } from "@dub/utils";
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
        values: {
          clicks,
          leads: Math.ceil(clicks / 2),
          sales: Math.floor(clicks / 2),
        }, // TODO: Update these accessors once we have leads and sales data
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
      colorClassName: "text-sky-400",
    },
    {
      id: "leads",
      valueAccessor: (d) => d.values.leads,
      isActive: show.includes("leads"),
      colorClassName: "text-violet-600",
    },
    {
      id: "sales",
      valueAccessor: (d) => d.values.sales,
      isActive: show.includes("sales"),
      colorClassName: "text-teal-400",
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
                const s = series.find(({ id }) => id === resource);
                const value = d.values[resource];
                return (
                  <div className="flex items-center gap-2">
                    {s && (
                      <div
                        className={cn(
                          s.colorClassName,
                          "h-2 w-2 rounded-sm bg-current opacity-50 shadow-[inset_0_0_0_1px_#0003]",
                        )}
                      />
                    )}
                    <p className="text-gray-600">
                      <strong className="font-medium text-gray-800">
                        {nFormatter(value, { full: true })}
                      </strong>{" "}
                      {value === 1 ? resource.slice(0, -1) : resource}
                    </p>
                  </div>
                );
              })}
              <p className="mt-0.5 text-sm text-gray-500">
                {formatDate(d.date)}
              </p>
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
