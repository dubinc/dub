import { useContext } from "react";
import useSWR from "swr";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { fetcher, nFormatter } from "@dub/utils";
import { AnalyticsContext } from ".";
import BarChart from "./bar-chart";
import { pluralizeJSX } from "@dub/ui";

export default function ClicksChart() {
  const { interval, baseApiPath, queryString } = useContext(AnalyticsContext);

  const {
    data: timeseries,
    isLoading: loadingTimeseries,
    isValidating: validatingTimeseries,
  } = useSWR<{ start: string; clicks: number }[]>(
    `${baseApiPath}/timeseries?${queryString}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (loadingTimeseries || validatingTimeseries) {
    return (
      <div className="h-[300px] w-full animate-pulse rounded-md bg-gray-200 sm:h-[400px]" />
    );
  }

  return (
    <div className="h-[400px] w-full">
      <ParentSize>
        {({ width, height }) => (
          <BarChart
            width={width}
            height={height}
            interval={interval}
            data={(timeseries ?? []).map(({ start, clicks }) => ({
              date: new Date(start),
              value: clicks,
            }))}
            tooltipContent={(props) => (
              <TooltipContent
                interval={interval}
                data={props.data}
                formatTimestamp={props.formatTimestamp}
              />
            )}
          />
        )}
      </ParentSize>
    </div>
  );
}

type TooltipData = {
  value: number;
  start: Date;
  end: Date;
};

function TooltipContent({
  interval,
  data,
  formatTimestamp,
}: {
  interval: string;
  data: TooltipData;
  formatTimestamp: (d: Date) => string;
}) {
  return (
    <div className="px-1 py-1 text-center sm:px-2">
      {pluralizeJSX(
        (count, noun) => (
          <h3 className="text-black">
            <span className="text-xl font-semibold sm:text-2xl">
              {nFormatter(count)}
            </span>{" "}
            {noun}
          </h3>
        ),
        data.value,
        "click",
      )}
      <p className="text-xs text-gray-600">
        {formatTimestamp(data.start)} -{" "}
        {interval === "24h"
          ? new Date(data.end).toLocaleTimeString("en-us", {
              hour: "numeric",
            })
          : formatTimestamp(data.end)}
      </p>
    </div>
  );
}
