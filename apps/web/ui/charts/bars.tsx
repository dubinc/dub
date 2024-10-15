import { cn } from "@dub/utils";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import { BarRounded } from "@visx/shape";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { useChartContext } from "./chart-context";

export function Bars({
  seriesClassNames,
}: {
  seriesClassNames?: { id: string; gradient?: string; bar?: string }[];
}) {
  const { data, series, margin, xScale, yScale, height, startDate, endDate } =
    useChartContext();

  if (!("bandwidth" in xScale))
    throw new Error("Bars require a band scale (type=bar)");

  // Data with all values set to zero to animate from
  const zeroedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      values: Object.fromEntries(Object.keys(d.values).map((key) => [key, 0])),
    })) as typeof data;
  }, [data]);

  return (
    <Group left={margin.left} top={margin.top}>
      <AnimatePresence>
        {series
          .filter(({ isActive }) => isActive)
          .map((s) => (
            // Prevent ugly x-scale animations when start/end dates change with unique key
            <motion.g
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              key={`${s.id}_${startDate.toString()}_${endDate.toString()}`}
            >
              {/* Bar gradient */}
              <LinearGradient
                className={cn(
                  s.colorClassName ?? "text-blue-500",
                  seriesClassNames?.find(({ id }) => id === s.id)?.gradient,
                )}
                id={`${s.id}-background`}
                fromOffset="0%"
                from="currentColor"
                fromOpacity={0.01}
                toOffset="40%"
                to="currentColor"
                toOpacity={1}
                x1={0}
                x2={0}
                y1={1}
              />

              {/* Bars */}
              {data.map((d) => {
                const barWidth = xScale.bandwidth();
                const y = yScale(s.valueAccessor(d) ?? 0);
                const barHeight = height - y;
                return (
                  <BarRounded
                    key={d.date.toString()}
                    x={xScale(d.date) ?? 0}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    radius={1000}
                    top
                    className={cn(
                      s.colorClassName ?? "text-blue-700",
                      seriesClassNames?.find(({ id }) => id === s.id)?.bar,
                    )}
                    fill={`url(#${s.id}-background)`}
                  />
                );
              })}
            </motion.g>
          ))}
      </AnimatePresence>
    </Group>
  );
}
