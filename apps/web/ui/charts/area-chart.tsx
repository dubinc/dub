import { AxisBottom } from "@visx/axis";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleUtc } from "@visx/scale";
import { Area, AreaClosed, Circle, Line } from "@visx/shape";
import { createContext, useContext, useMemo } from "react";
import { ChartContext, Datum } from "./types";

const ChartContext = createContext<ChartContext | null>(null);

function useChartContext<T extends Datum>(): ChartContext<T> {
  const chartContext = useContext(ChartContext);
  if (!chartContext) throw new Error("No chart context");
  return chartContext;
}

export default function AreaChart<T extends Datum>(props: ChartContext<T>) {
  return (
    <ChartContext.Provider value={props}>
      <ParentSize>
        {({ width, height }) => {
          return <AreaChartInner {...props} width={width} height={height} />;
        }}
      </ParentSize>
    </ChartContext.Provider>
  );
}

function AreaChartInner<T extends Datum>({
  width: outerWidth,
  height: outerHeight,
}: {
  width: number;
  height: number;
}) {
  const chartContext = useChartContext<T>();
  const {
    data,
    series,
    startDate,
    endDate,
    tickFormat = (date) =>
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    tooltipContent,
    margin = {
      top: 2,
      right: 3,
      bottom: 32,
      left: 3,
    },
    padding = {
      top: 0.1,
      bottom: 0.1,
    },
    xIntervalEveryCount = 1,
  } = chartContext;

  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  // Find min and max y values for all series
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

  return (
    <>
      <svg width={outerWidth} height={outerHeight}>
        <Group left={margin.left}>
          <Group
            top={margin.top}
            // onTouchStart={handleTooltip}
            // onTouchMove={handleTooltip}
            // onMouseMove={handleTooltip}
            // onMouseLeave={hideTooltip}
          >
            {series.map((s) => (
              <>
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
                <AreaClosed
                  data={data}
                  x={(d) => xScale(d.date)}
                  y={(d) => yScale(s.accessorFn(d) ?? 0)}
                  yScale={yScale}
                  fill={`url(#${s.id}-background)`}
                />

                {/* Line */}
                <Area
                  data={data}
                  x={(d) => xScale(d.date)}
                  y={(d) => yScale(s.accessorFn(d) ?? 0)}
                  className="text-blue-800"
                  stroke="currentColor"
                  strokeOpacity={0.8}
                  strokeWidth={2}
                />

                {/* Latest value dot */}
                <Circle
                  cx={xScale(data.at(-1)!.date)}
                  cy={yScale(s.accessorFn(data.at(-1)!))}
                  r={3}
                  className="text-blue-700"
                  fill="currentColor"
                />
              </>
            ))}

            {/* Vertical grid lines */}
            {data.length > 0 &&
              data
                .filter((_, idx) => idx % xIntervalEveryCount === 0)
                .map((d, idx, { length }) => (
                  <Line
                    x1={xScale(d.date)}
                    x2={xScale(d.date)}
                    y1={height}
                    y2={0}
                    stroke="#00000026"
                    strokeWidth={1}
                    strokeDasharray={idx !== length - 1 ? 5 : 0}
                  />
                ))}
          </Group>
          <AxisBottom
            top={margin.top + height}
            scale={xScale}
            tickValues={data.map(({ date }) => date)}
            hideTicks
            stroke="#00000026"
            tickFormat={(date) => tickFormat(date as Date)}
            tickLabelProps={(_, idx, { length }) => ({
              textAnchor:
                idx === 0 ? "start" : idx === length - 1 ? "end" : "middle",
              fontSize: 12,
              fill: idx === length - 1 ? "#000" : "#00000066",
            })}
          />
        </Group>
      </svg>
    </>
  );
}
