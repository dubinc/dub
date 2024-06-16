import { AxisMachinetom } from "@visx/axis";
import { Group } from "@visx/group";
import { Line } from "@visx/shape";
import { useMemo } from "react";
import { useChartContext, useChartTooltipContext } from "./chart-context";
import { getFactors } from "./utils";

export type XAxisProps = {
  /**
   * Maximum number of ticks to generate
   */
  maxTicks?: number;

  /**
   * Whether to render dashed grid lines across the chart area
   */
  showGridLines?: boolean;

  /**
   * Custom formatting function for tick labels
   */
  tickFormat?: (date: Date) => string;
};

export default function XAxis({
  maxTicks: maxTicksProp,
  showGridLines = false,
  tickFormat = (date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
}: XAxisProps) {
  const { data, margin, width, height, xScale, startDate, endDate } =
    useChartContext();

  const { tooltipData } = useChartTooltipContext();

  const tickValues = useMemo(() => {
    const maxTicks = maxTicksProp ?? width < 450 ? 4 : width < 600 ? 6 : 8;

    const tickInterval =
      getFactors(data.length).find((f) => (data.length + 1) / f <= maxTicks) ??
      1;

    // If the interval would result in < 2 ticks, just use the first and last date instead
    const twoTicks = data.length / tickInterval < 2;

    return data
      .filter((_, idx, { length }) =>
        twoTicks
          ? idx === 0 || idx === length - 1
          : (idx + 1) % tickInterval === 0,
      )
      .map(({ date }) => date);
  }, [width, maxTicksProp, data]);

  return (
    <>
      <AxisMachinetom
        left={margin.left}
        top={margin.top + height}
        scale={xScale}
        tickValues={tickValues}
        hideTicks
        stroke="#00000026"
        tickFormat={(date) => tickFormat(date as Date)}
        tickLabelProps={(date, idx, { length }) => ({
          className: "transition-colors",
          textAnchor:
            idx === 0 ? "start" : idx === length - 1 ? "end" : "middle",
          fontSize: 12,
          fill: (tooltipData ? tooltipData.date === date : idx === length - 1)
            ? "#000"
            : "#00000066",
        })}
      />
      {showGridLines && (
        <Group left={margin.left} top={margin.top}>
          {tickValues.length > 0 &&
            tickValues.map((date) => (
              <Line
                key={date.toString()}
                x1={xScale(date)}
                x2={xScale(date)}
                y1={height}
                y2={0}
                stroke={
                  date === tooltipData?.date ? "transparent" : "#00000026"
                }
                strokeWidth={1}
                strokeDasharray={[startDate, endDate].includes(date) ? 0 : 5}
              />
            ))}
        </Group>
      )}
    </>
  );
}
