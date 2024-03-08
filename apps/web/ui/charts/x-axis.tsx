import { cn } from "@dub/utils";
import { AxisBottom } from "@visx/axis";
import { useChartContext, useChartTooltipContext } from "./chart-context";

export default function XAxis({
  tickFormat = (date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
}: {
  tickFormat?: (date: Date) => string;
}) {
  const { data, margin, height, xScale, xTickInterval } = useChartContext();

  const { tooltipData } = useChartTooltipContext();

  return (
    <AxisBottom
      left={margin.left}
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
        textAnchor: idx === 0 ? "start" : idx === length - 1 ? "end" : "middle",
        fontSize: 12,
        fill: (tooltipData ? tooltipData.date === date : idx === length - 1)
          ? "#000"
          : "#00000066",
      })}
    />
  );
}
