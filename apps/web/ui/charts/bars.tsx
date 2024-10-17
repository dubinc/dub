import { cn } from "@dub/utils";
import { RectClipPath } from "@visx/clip-path";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import { BarRounded } from "@visx/shape";
import { AnimatePresence, motion } from "framer-motion";
import { useId } from "react";
import { useChartContext } from "./chart-context";

export function Bars({
  seriesStyles,
}: {
  seriesStyles?: {
    id: string;
    gradientClassName?: string;
    barClassName?: string;
    barFill?: string;
  }[];
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

  return (
    <Group left={margin.left} top={margin.top}>
      <RectClipPath id={clipPathId} x={0} y={0} width={width} height={height} />
      <AnimatePresence>
        {series
          .filter(({ isActive }) => isActive)
          .map((s) => {
            const styles = seriesStyles?.find(({ id }) => id === s.id);
            return (
              // Prevent ugly x-scale animations when start/end dates change with unique key
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                key={`${s.id}_${startDate.toString()}_${endDate.toString()}`}
                clipPath={`url(#${clipPathId})`}
              >
                {/* Bar gradient */}
                <LinearGradient
                  className={cn(
                    s.colorClassName ?? "text-blue-500",
                    styles?.gradientClassName,
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
                <motion.g
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  {data.map((d) => {
                    const barWidth = xScale.bandwidth();
                    const x = xScale(d.date) ?? 0;
                    const y = yScale(s.valueAccessor(d) ?? 0);
                    const barHeight = height - y;
                    const radius = Math.min(barWidth, barHeight) / 2;
                    return barHeight > 0 ? (
                      <BarRounded
                        key={d.date.toString()}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        radius={1000}
                        top
                        className={cn(
                          s.colorClassName ?? "text-blue-700",
                          styles?.barClassName,
                        )}
                        fill={styles?.barFill ?? `url(#${s.id}-background)`}
                      />
                    ) : null;
                  })}
                </motion.g>
              </motion.g>
            );
          })}
      </AnimatePresence>
    </Group>
  );
}
