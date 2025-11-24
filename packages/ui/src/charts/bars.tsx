import { cn } from "@dub/utils";
import { RectClipPath } from "@visx/clip-path";
import { Group } from "@visx/group";
import { BarRounded } from "@visx/shape";
import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { useChartContext } from "./chart-context";

export function Bars({
  seriesStyles,
  radius = 2,
}: {
  seriesStyles?: {
    id: string;
    barClassName?: string;
    barFill?: string;
  }[];
  radius?: number;
}) {
  const clipPathId = useId();
  const {
    data,
    series,
    margin,
    xScale,
    yScale,
    width,
    height,
    startDate,
    endDate,
  } = useChartContext();

  if (!("bandwidth" in xScale))
    throw new Error("Bars require a band scale (type=bar)");

  const activeSeries = series.filter(({ isActive }) => isActive);

  return (
    <Group left={margin.left} top={margin.top}>
      <RectClipPath id={clipPathId} x={0} y={0} width={width} height={height} />
      <AnimatePresence>
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          key={`${activeSeries.map((s) => s.id).join(",")}_${startDate.toString()}_${endDate.toString()}`}
          clipPath={`url(#${clipPathId})`}
        >
          {data.map((d) => {
            const barWidth = xScale.bandwidth();
            const x = xScale(d.date) ?? 0;

            const sortedSeries = activeSeries
              .filter((s) => s.valueAccessor(d) > 0)
              .sort((a, b) => b.valueAccessor(d) - a.valueAccessor(d));

            const bars = sortedSeries.reduce((acc, s) => {
              const prev = acc?.[acc.length - 1];

              const value = s.valueAccessor(d) ?? 0;
              const barHeight = yScale(value);

              console.log({ value, barHeight });

              return [
                ...acc,
                {
                  id: s.id,
                  value,
                  colorClassName: s.colorClassName,
                  styles: seriesStyles?.find(({ id }) => id === s.id),
                  y: 0,
                  height: barHeight,
                },
              ];
            }, [] as any[]);

            return (
              <g key={d.date.toString()}>
                {bars.map((b) => {
                  return (
                    <BarRounded
                      key={b.id}
                      x={x}
                      y={height - b.y - b.height}
                      width={barWidth}
                      height={b.height}
                      radius={radius}
                      top
                      className={cn(
                        "opacity-50",
                        b.colorClassName ?? "text-blue-700",
                        b.styles?.barClassName,
                      )}
                      stroke="red"
                      fill={
                        "transparent" || b.styles?.barFill || "currentColor"
                      }
                    />
                  );
                })}
              </g>
            );
          })}
        </motion.g>
      </AnimatePresence>
    </Group>
  );
}
