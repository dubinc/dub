import { CompositeAnalyticsResponseOptions } from "@/lib/analytics/types";
import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { CountingNumbers, useMediaQuery, useRouterStuff } from "@dub/ui";
import { capitalize, cn, fetcher } from "@dub/utils";
import { curveNatural } from "@visx/curve";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleUtc } from "@visx/scale";
import { Area, AreaClosed } from "@visx/shape";
import { motion } from "framer-motion";
import { useCallback, useContext, useEffect, useMemo } from "react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { AnalyticsContext } from "../analytics-provider";

type TimeseriesData = {
  start: Date;
  clicks: number;
  leads: number;
  sales: number;
  amount: number;
}[];

export default function EventsTabs() {
  const { searchParams, queryParams } = useRouterStuff();
  const { isMobile } = useMediaQuery();

  const tab = searchParams.get("event") || "clicks";
  const { demoPage } = useContext(AnalyticsContext);

  const { conversionEnabled } = useWorkspace();
  const { baseApiPath, queryString, requiresUpgrade } =
    useContext(AnalyticsContext);

  const { data: totalEvents, isLoading: isLoadingTotalEvents } = useSWR<{
    [key in CompositeAnalyticsResponseOptions]: number;
  }>(
    `${baseApiPath}?${editQueryString(queryString, {
      event: demoPage || conversionEnabled ? "composite" : "clicks",
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: timeseriesData, isLoading: isLoadingTimeseries } =
    useSWRImmutable<TimeseriesData>(
      `${baseApiPath}?${editQueryString(queryString, {
        groupBy: "timeseries",
        event: demoPage || conversionEnabled ? "composite" : "clicks",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })}`,
      fetcher,
      {
        shouldRetryOnError: !requiresUpgrade,
        keepPreviousData: true,
      },
    );

  const onEventTabClick = useCallback(
    (event: string) => {
      const sortOptions =
        event === "sales" ? ["timestamp", "amount"] : ["date"];
      const currentSort = searchParams.get("sort");
      queryParams({
        set: { event },
        del: [
          // Reset pagination
          "page",
          // Reset sort if not possible
          ...(currentSort && !sortOptions.includes(currentSort)
            ? ["sort"]
            : []),
        ],
      });
    },
    [queryParams, searchParams.get("sort")],
  );

  useEffect(() => {
    const sortBy = searchParams.get("sort");
    if (tab !== "sales" && sortBy !== "timestamp") queryParams({ del: "sort" });
  }, [tab, searchParams.get("sort")]);

  return (
    <div className="grid w-full grid-cols-3 gap-2 overflow-x-auto sm:gap-4">
      {[
        "clicks",
        ...(demoPage || conversionEnabled ? ["leads", "sales"] : []),
      ].map((event) => (
        <button
          key={event}
          className={cn(
            "flex justify-between gap-4 rounded-xl border bg-white px-5 py-4 text-left transition-[box-shadow] focus:outline-none",
            tab === event && conversionEnabled
              ? "border-black shadow-[0_0_0_1px_black_inset]"
              : "border-gray-200 focus-visible:border-black",
          )}
          onClick={() => onEventTabClick(event)}
        >
          <div>
            <p className="text-sm text-gray-600">{capitalize(event)}</p>
            <div className="mt-2">
              {totalEvents ? (
                <CountingNumbers
                  as="p"
                  className={cn(
                    "text-2xl transition-opacity",
                    isLoadingTotalEvents && "opacity-40",
                  )}
                  prefix={event === "sales" && "$"}
                  {...(event === "sales" && { fullNumber: true })}
                >
                  {event === "sales"
                    ? (totalEvents?.amount ?? 0) / 100
                    : totalEvents?.[event] ?? 0}
                </CountingNumbers>
              ) : (
                <div className="h-8 w-12 animate-pulse rounded-md bg-gray-200" />
              )}
            </div>
          </div>
          {timeseriesData && !isMobile && (
            <div
              className={cn(
                "relative h-full max-w-[140px] grow transition-opacity",
                isLoadingTimeseries && "opacity-40",
              )}
            >
              <Chart data={timeseriesData} event={event} />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

type ChartProps = { data: TimeseriesData; event: string };
function Chart(props: ChartProps) {
  return (
    <ParentSize className="relative">
      {({ width, height }) => {
        return (
          width > 0 &&
          height > 0 && <ChartInner {...{ width, height, ...props }} />
        );
      }}
    </ParentSize>
  );
}

const padding = { top: 8, right: 2, bottom: 2, left: 2 };

function ChartInner({
  data,
  event,
  width,
  height,
}: ChartProps & { width: number; height: number }) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: new Date(d.start),
        value:
          ((event === "sales" ? d?.amount : d?.[event]) as
            | number
            | undefined) ?? 0,
      })) ?? null,
    [data, event],
  );

  const zeroedData = useMemo(
    () =>
      chartData.map(({ date }) => ({
        date,
        value: 0,
      })),
    [chartData],
  );

  const { yScale, xScale } = useMemo(() => {
    const values = chartData.map(({ value }) => value);
    const maxY = Math.max(...values);

    const dateTimes = chartData.map(({ date }) => date.getTime());
    const minDate = new Date(Math.min(...dateTimes));
    const maxDate = new Date(Math.max(...dateTimes));

    return {
      yScale: scaleLinear<number>({
        domain: [-2, Math.max(maxY, 2)],
        range: [height - padding.top - padding.bottom, 0],
        nice: true,
        clamp: true,
      }),
      xScale: scaleUtc<number>({
        domain: [minDate, maxDate],
        range: [0, width - padding.left - padding.right],
        nice: true,
      }),
    };
  }, [chartData, height, width]);

  return (
    <svg width={width} height={height} key={chartData.length}>
      <defs>
        <LinearGradient
          id="color-gradient"
          from="#7D3AEC"
          to="#DA2778"
          x1={0}
          x2={width - padding.left - padding.right}
          gradientUnits="userSpaceOnUse"
        />
        <LinearGradient
          id="mask-gradient"
          from="white"
          to="white"
          fromOpacity={0.3}
          toOpacity={0}
          x1={0}
          x2={0}
          y1={0}
          y2={1}
        />
        <mask id="mask" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#mask-gradient)" />
        </mask>
      </defs>
      <Group left={padding.left} top={padding.top}>
        <Area
          data={chartData}
          x={({ date }) => xScale(date)}
          y={({ value }) => yScale(value) ?? 0}
          curve={curveNatural}
        >
          {({ path }) => {
            return (
              <motion.path
                initial={{ d: path(zeroedData) || "", opacity: 0 }}
                animate={{ d: path(chartData) || "", opacity: 1 }}
                strokeWidth={1.5}
                stroke="url(#color-gradient)"
              />
            );
          }}
        </Area>

        <AreaClosed
          data={chartData}
          x={({ date }) => xScale(date)}
          y={({ value }) => yScale(value) ?? 0}
          yScale={yScale}
          curve={curveNatural}
        >
          {({ path }) => {
            return (
              <motion.path
                initial={{ d: path(zeroedData) || "", opacity: 0 }}
                animate={{ d: path(chartData) || "", opacity: 1 }}
                fill="url(#color-gradient)"
                mask="url(#mask)"
              />
            );
          }}
        </AreaClosed>
      </Group>
    </svg>
  );
}
