import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleUtc } from "@visx/scale";
import { Bar, Circle, Line } from "@visx/shape";
import { PropsWithChildren, useMemo } from "react";
import { ChartContext, ChartTooltipContext } from "./chart-context";
import {
  ChartProps,
  Datum,
  type ChartContext as ChartContextType,
} from "./types";
import { useTooltip } from "./useTooltip";

const factors = (number) =>
  [...Array(number + 1).keys()].filter((i) => number % i === 0);

type TimeSeriesChartProps<T extends Datum> = PropsWithChildren<ChartProps<T>>;

export default function TimeSeriesChart<T extends Datum>(
  props: TimeSeriesChartProps<T>,
) {
  return (
    <ParentSize className="relative">
      {({ width, height }) => {
        return (
          width > 0 &&
          height > 0 && (
            <TimeSeriesChartInner {...props} width={width} height={height} />
          )
        );
      }}
    </ParentSize>
  );
}

function TimeSeriesChartInner<T extends Datum>({
  width: outerWidth,
  height: outerHeight,
  children,
  data,
  series,
  tooltipContent = (d) => series[0].accessorFn(d).toString(),
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
}: {
  width: number;
  height: number;
} & TimeSeriesChartProps<T>) {
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

  const { maxTicks, xTickInterval } = useMemo(() => {
    const maxTicks = maxTicksProp ?? width < 500 ? 6 : width < 800 ? 8 : 12;
    const xTickInterval =
      factors(data.length).find((f) => data.length / f < maxTicks) ?? 1;

    return { maxTicks, xTickInterval };
  }, [maxTicksProp]);

  const chartContext: ChartContextType<T> = {
    width,
    height,
    data,
    series,
    startDate,
    endDate,
    xScale,
    yScale,
    margin,
    padding,
    tooltipContent,
    maxTicks,
    xTickInterval,
  };

  const tooltipContext = useTooltip({
    seriesId: series[0].id,
    chartContext,
  });

  const {
    tooltipData,
    TooltipWrapper,
    tooltipLeft,
    tooltipTop,
    handleTooltip,
    hideTooltip,
    containerRef,
  } = tooltipContext;

  return (
    <ChartContext.Provider value={chartContext}>
      <ChartTooltipContext.Provider value={tooltipContext}>
        <svg width={outerWidth} height={outerHeight} ref={containerRef}>
          {children}
          <Group left={margin.left} top={margin.top}>
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
      </ChartTooltipContext.Provider>
    </ChartContext.Provider>
  );
}
