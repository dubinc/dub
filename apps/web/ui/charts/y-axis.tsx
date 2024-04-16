import { AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { Line } from "@visx/shape";
import { getStringWidth } from "@visx/text";
import { useLayoutEffect, useMemo } from "react";
import { useChartContext } from "./chart-context";

export type YAxisProps = {
  /**
   * Approximate number of ticks to generate (see d3-array's `ticks`)
   */
  numTicks?: number;

  /**
   * Whether to render dashed grid lines across the chart area
   */
  showGridLines?: boolean;

  /**
   * Whether to only generate integer ticks (no decimals)
   */
  integerTicks?: boolean;

  /**
   * Tick values to override dynamic tick generation
   */
  tickValues?: number[];

  /**
   * Custom formatting function for tick labels
   */
  tickFormat?: (value: number) => string;

  /**
   * Amount of space between tick labels and the axis line / chart area
   */
  tickAxisSpacing?: number;
};

export default function YAxis({
  numTicks: numTicksProp,
  showGridLines = false,
  integerTicks = false,
  tickValues: tickValuesProp,
  tickFormat = (value: number) => value.toString(),
  tickAxisSpacing = 8,
}: YAxisProps) {
  const {
    width,
    height,
    margin,
    yScale,
    minY,
    leftAxisMargin,
    setLeftAxisMargin,
  } = useChartContext();

  const tickValues = useMemo(() => {
    if (tickValuesProp) return tickValuesProp;

    const numTicks = numTicksProp ?? height < 350 ? 3 : 4;

    return yScale.ticks(numTicks).filter((value) =>
      // Both of these reduce the number of ticks farther below numTicks, but this should only affect small ranges
      value >= minY && integerTicks ? Number.isInteger(value) : true,
    );
  }, [tickValuesProp, numTicksProp, height, yScale, integerTicks]);

  useLayoutEffect(() => {
    const maxWidth =
      Math.max(
        ...tickValues.map(
          (v) => getStringWidth(tickFormat(v), { fontSize: 12 }) ?? 0,
        ),
      ) + tickAxisSpacing;
    if ((leftAxisMargin ?? 0) < maxWidth) setLeftAxisMargin(maxWidth);
  }, [tickValues, tickAxisSpacing, leftAxisMargin]);

  return (
    <>
      <AxisLeft
        left={margin.left}
        top={margin.top}
        scale={yScale}
        tickValues={tickValues}
        hideTicks
        stroke="transparent"
        tickFormat={(value) => tickFormat(value as number)}
        tickLength={tickAxisSpacing}
        tickLabelProps={() => ({
          fontSize: 12,
          fill: "#00000066",
          textAnchor: "end",
          verticalAnchor: "middle",
        })}
      />
      {showGridLines && (
        <Group left={margin.left} top={margin.top}>
          {tickValues.length > 0 &&
            tickValues.map((value) => {
              const y = yScale(value);
              if (y === height) return undefined; // Don't draw grid line at bottom of chart area

              return (
                <Line
                  key={value.toString()}
                  y1={y}
                  y2={y}
                  x1={0}
                  x2={width}
                  stroke="#00000026"
                  strokeWidth={1}
                  strokeDasharray={5}
                />
              );
            })}
        </Group>
      )}
    </>
  );
}
