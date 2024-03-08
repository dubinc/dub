import { cn } from "@dub/utils";
import { AxisBottom } from "@visx/axis";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleUtc } from "@visx/scale";
import { Area, AreaClosed, Bar, Circle, Line } from "@visx/shape";
import { motion } from "framer-motion";
import { Fragment, createContext, useContext, useMemo } from "react";
import { ChartContext, Data, Datum, TimeSeriesDatum } from "./types";
import { useTooltip } from "./useTooltip";

const ChartContext = createContext<ChartContext | null>(null);

function useChartContext<T extends Datum>(): ChartContext<T> {
  const chartContext = useContext(ChartContext);
  if (!chartContext) throw new Error("No chart context");
  return chartContext;
}

const factors = (number) =>
  [...Array(number + 1).keys()].filter((i) => number % i === 0);

type AreaChartProps<T extends Datum> = Omit<
  ChartContext<T>,
  "width" | "height" | "xScale" | "yScale"
>;

export default function AreaChart<T extends Datum>(props: AreaChartProps<T>) {
  return (
    <ParentSize className="relative">
      {({ width, height }) => {
        return (
          width > 0 &&
          height > 0 && (
            <AreaChartInner {...props} width={width} height={height} />
          )
        );
      }}
    </ParentSize>
  );
}

function AreaChartInner<T extends Datum>({
  width: outerWidth,
  height: outerHeight,
  ...outerProps
}: {
  width: number;
  height: number;
} & AreaChartProps<T>) {
  const {
    data,
    series,
    tickFormat = (date) =>
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    tooltipContent,
    margin = {
      top: 2,
      right: 4,
      bottom: 32,
      left: 4,
    },
    padding = {
      top: 0.1,
      bottom: 0.1,
    },
    maxTicks: maxTicksProp,
  } = outerProps;

  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  const { startDate, endDate } = useMemo(() => {
    const dates = data.map(({ date }) => date);
    const times = dates.map((d) => d.getTime());

    return {
      startDate: dates[times.indexOf(Math.min(...times))],
      endDate: dates[times.indexOf(Math.max(...times))],
    };
  }, data);

  const { minY, maxY } = useMemo(() => {
    const values = series
      .filter(({ isActive }) => isActive !== false)
      .map(({ accessorFn }) => data.map((d) => accessorFn(d)))
      .flat()
      .filter((v): v is number => v != null);

    const minY = Math.min(...values);
    const maxY = Math.max(...values);

    const range = maxY - minY;

    return {
      minY: minY - range * (padding.bottom ?? 0),
      maxY: maxY + range * (padding.top ?? 0),
    };
  }, [data, series, padding?.bottom, padding?.top]);

  const { yScale, xScale } = useMemo(() => {
    return {
      yScale: scaleLinear<number>({
        domain: [minY, maxY],
        range: [height, 0],
        nice: true,
        clamp: true,
      }),
      xScale: scaleUtc<number>({
        domain: [startDate, endDate],
        range: [0, width],
      }),
    };
  }, [startDate, endDate, minY, maxY, height, width, margin]);

  const zeroedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      values: Object.fromEntries(Object.keys(d.values).map((key) => [key, 0])),
    })) as Data<T>;
  }, [data]);

  const maxTicks = maxTicksProp ?? width < 450 ? 6 : width < 900 ? 8 : 12;

  const xTickInterval =
    factors(data.length).find((f) => data.length / f < maxTicks) ?? 1;

  const chartContext = { ...outerProps, width, height, xScale, yScale };
  const {
    tooltipData,
    TooltipWrapper,
    tooltipLeft,
    tooltipTop,
    handleTooltip,
    hideTooltip,
    containerRef,
  } = useTooltip({
    seriesId: series[0].id,
    chartContext,
  });

  return (
    <ChartContext.Provider value={chartContext}>
      <svg width={outerWidth} height={outerHeight} ref={containerRef}>
        <Group left={margin.left}>
          <Group top={margin.top}>
            {series.map((s) => (
              <Fragment key={s.id}>
                <LinearGradient
                  className="text-blue-500"
                  id={`${s.id}-background`}
                  fromOffset="20%"
                  from="currentColor"
                  fromOpacity={0.01}
                  to="currentColor"
                  toOpacity={0.2}
                  x={0}
                  y1={1}
                />

                {/* Area */}
                <AreaClosed<TimeSeriesDatum<T>>
                  x={(d) => xScale(d.date)}
                  y={(d) => yScale(s.accessorFn(d) ?? 0)}
                  yScale={yScale}
                >
                  {({ path }) => {
                    return (
                      <motion.path
                        initial={{ d: path(zeroedData) || "" }}
                        animate={{ d: path(data) || "" }}
                        fill={`url(#${s.id}-background)`}
                      />
                    );
                  }}
                </AreaClosed>

                {/* Line */}
                <Area<TimeSeriesDatum<T>>
                  x={(d) => xScale(d.date)}
                  y={(d) => yScale(s.accessorFn(d) ?? 0)}
                >
                  {({ path }) => (
                    <motion.path
                      initial={{ d: path(zeroedData) || "" }}
                      animate={{ d: path(data) || "" }}
                      className="text-blue-700"
                      stroke="currentColor"
                      strokeOpacity={0.8}
                      strokeWidth={2}
                    />
                  )}
                </Area>

                {/* Latest value dot */}
                {!tooltipData && (
                  <Circle
                    cx={xScale(data.at(-1)!.date)}
                    cy={yScale(s.accessorFn(data.at(-1)!))}
                    r={4}
                    className="text-blue-700"
                    fill="currentColor"
                  />
                )}
              </Fragment>
            ))}

            {/* Vertical grid lines */}
            {data.length > 0 &&
              data
                .filter((_, idx) => idx % xTickInterval === 0)
                .map((d, idx, { length }) => (
                  <Line
                    key={d.date.toString()}
                    x1={xScale(d.date)}
                    x2={xScale(d.date)}
                    y1={height}
                    y2={0}
                    stroke={
                      d.date === tooltipData?.date ? "transparent" : "#00000026"
                    }
                    strokeWidth={1}
                    strokeDasharray={d.date !== endDate ? 5 : 0}
                  />
                ))}

            {/* Tooltip hover line + circle */}
            {tooltipData && (
              <>
                <Line
                  x1={xScale(tooltipData.date)}
                  x2={xScale(tooltipData.date)}
                  y1={height}
                  y2={0}
                  strokeOpacity={0.1}
                  stroke="black"
                  strokeWidth={2}
                />

                {series.map((s) => (
                  <Circle
                    key={s.id}
                    cx={xScale(tooltipData.date)}
                    cy={yScale(s.accessorFn(tooltipData))}
                    r={4}
                    className="text-blue-800"
                    fill="currentColor"
                  />
                ))}
              </>
            )}

            {/* Tooltip hover region */}
            <Bar
              x={0}
              y={0}
              width={width}
              height={height}
              onTouchStart={handleTooltip}
              onTouchMove={handleTooltip}
              onMouseMove={handleTooltip}
              onMouseLeave={hideTooltip}
              fill="transparent"
            />
          </Group>
          <AxisBottom
            top={margin.top + height}
            scale={xScale}
            tickValues={data.map(({ date }) => date)}
            hideTicks
            stroke="#00000026"
            tickFormat={(date) => tickFormat(date as Date)}
            tickLabelProps={(date, idx, { length }) => ({
              className: cn(
                "transition-colors",
                idx % xTickInterval !== 0 && "hidden",
              ),
              textAnchor:
                idx === 0 ? "start" : idx === length - 1 ? "end" : "middle",
              fontSize: 12,
              fill: (
                tooltipData ? tooltipData.date === date : idx === length - 1
              )
                ? "#000"
                : "#00000066",
            })}
          />
        </Group>
      </svg>

      {/* Tooltips */}
      <div className="pointer-events-none absolute inset-0">
        {tooltipData && (
          <TooltipWrapper
            key={tooltipData.date.toString()}
            left={(tooltipLeft ?? 0) + margin.left}
            top={(tooltipTop ?? 0) + margin.top}
            offsetLeft={8}
            offsetTop={0}
            className="absolute"
            unstyled={true}
          >
            <div className="pointer-events-none rounded-md border border-gray-200 bg-white px-4 py-2 text-base shadow-sm">
              {tooltipContent?.(tooltipData) ??
                series[0].accessorFn(tooltipData)}
            </div>
          </TooltipWrapper>
        )}
      </div>
    </ChartContext.Provider>
  );
}
