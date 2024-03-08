import { Group } from "@visx/group";
import { Line } from "@visx/shape";
import { useChartContext, useChartTooltipContext } from "./chart-context";

export default function GridLines() {
  const { data, endDate, margin, height, xScale, xTickInterval } =
    useChartContext();

  const { tooltipData } = useChartTooltipContext();

  return (
    <Group left={margin.left} top={margin.top}>
      {data.length > 0 &&
        data
          .filter((_, idx) => idx % xTickInterval === 0)
          .map((d) => (
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
    </Group>
  );
}
