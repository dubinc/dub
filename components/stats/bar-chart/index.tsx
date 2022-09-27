import { useMemo } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { scaleBand, scaleLinear } from "@visx/scale";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { withScreenSize } from "@visx/responsive";
import { IntervalProps, StatsProps, intervalData } from "@/lib/stats";
import { nFormatter } from "@/lib/utils";
import styles from "./index.module.css";
import { motion } from "framer-motion";
import { useRouter } from "next/router";

const LEFT_AXIS_WIDTH = 30;
const CHART_MAX_HEIGHT = 400;
const CHART_MAX_WIDTH = 800;

type TooltipData = {
  start: number;
  end: number;
  count: number;
  link: string;
};

const rangeFormatter = (maxN: number): number => {
  if (maxN < 5) return 5;
  /**
   * Get the max range for a chart based on the maxN value
   */
  return Math.ceil(maxN / 5) * 5;
};

const BarChart = ({
  data,
  isValidating,
  screenWidth,
}: {
  data: StatsProps["clicksData"];
  isValidating: boolean;
  screenWidth?: number;
}) => {
  const [CHART_WIDTH, CHART_HEIGHT] = useMemo(() => {
    const width = screenWidth
      ? Math.min(screenWidth * 0.7, CHART_MAX_WIDTH)
      : CHART_MAX_WIDTH;
    const height = screenWidth
      ? Math.min(screenWidth * 0.4, CHART_MAX_HEIGHT)
      : CHART_MAX_HEIGHT;
    return [width, height];
  }, [screenWidth]);

  const router = useRouter();
  const interval = (router.query.interval as IntervalProps) || "24h";

  const xScale = useMemo(() => {
    return scaleBand({
      range: [0, CHART_WIDTH],
      domain: data.map((d) => d.start),
      padding: 0.4,
    });
  }, [data, interval]);

  const yScale = useMemo(() => {
    return scaleLinear({
      range: [CHART_HEIGHT, 0],
      domain: [0, rangeFormatter(Math.max(...data.map((d) => d.count)))],
      nice: true,
      round: true,
    });
  }, [data, interval]);

  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<TooltipData>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    // TooltipInPortal is rendered in a separate child of <body /> and positioned
    // with page coordinates which should be updated on scroll. consider using
    // Tooltip or TooltipWithBounds if you don't need to render inside a Portal
    scroll: true,
    debounce: 100, // to avoid a weird tooltip flickering bug
  });

  let tooltipTimeout: number | undefined;
  return (
    <figure className="flex my-10" style={{ width: CHART_WIDTH }}>
      <svg ref={containerRef} height={CHART_HEIGHT} width={LEFT_AXIS_WIDTH}>
        <AxisLeft
          hideAxisLine
          hideTicks
          left={8}
          numTicks={4}
          scale={yScale}
          tickFormat={(d) => nFormatter(d as number)}
          tickLabelProps={() => ({
            fill: "#666666",
            filter: isValidating ? "blur(8px)" : "none",
            fontSize: 14,
            textAnchor: "start",
            transition: "all 0.4s ease-in-out",
          })}
        />
      </svg>
      <svg
        className="overflow-visible"
        height={CHART_HEIGHT}
        width={`calc(100% - ${LEFT_AXIS_WIDTH}px)`}
      >
        <AxisBottom
          hideAxisLine
          hideTicks
          scale={xScale}
          tickFormat={intervalData[interval].format}
          tickLabelProps={() => ({
            fill: "#666666",
            filter: isValidating ? "blur(8px)" : "none",
            fontSize: 12,
            textAnchor: "middle",
            transition: "all 0.4s ease-in-out",
          })}
          numTicks={6}
          top={CHART_HEIGHT - 5}
        />
        <GridRows
          numTicks={5}
          scale={yScale}
          stroke="#E1E1E1"
          width={CHART_WIDTH}
        />
        {data.map(({ start, end, count }) => {
          // const count = Math.round(Math.random() * 100);
          const barWidth = xScale.bandwidth();
          const barHeight = CHART_HEIGHT - (yScale(count) ?? 0);
          const barX = xScale(start) ?? 0;
          const barY = CHART_HEIGHT - barHeight;
          return (
            <motion.rect
              key={`bar-${start}`}
              transition={{ ease: "easeOut", duration: 0.3 }}
              className={styles.bar} // to override transformOrigin
              initial={{ transform: "scaleY(0)" }}
              animate={{ transform: "scaleY(1)" }}
              x={barX}
              y={barY}
              width={barWidth}
              height={barHeight}
              onMouseLeave={() => {
                tooltipTimeout = window.setTimeout(() => {
                  hideTooltip();
                }, 300);
              }}
              onMouseMove={(event) => {
                if (tooltipTimeout) clearTimeout(tooltipTimeout);
                // TooltipInPortal expects coordinates to be relative to containerRef
                // localPoint returns coordinates relative to the nearest SVG, which
                // is what containerRef is set to in this example.
                const eventSvgCoords = localPoint(event) ?? { x: 0, y: 0 };
                const left = barX + barWidth / 2 - 81;
                showTooltip({
                  tooltipData: {
                    start,
                    end,
                    count,
                    link: "https://google.com",
                  },
                  tooltipTop: eventSvgCoords.y - 150,
                  tooltipLeft: left,
                });
              }}
            />
          );
        })}
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          className={styles.tooltip}
        >
          <div className="text-center">
            <h3 className="text-black my-1">
              <span className="text-2xl font-semibold">
                {nFormatter(tooltipData.count)}
              </span>{" "}
              clicks
            </h3>
            <p className="text-xs text-gray-600">
              {intervalData[interval].format(tooltipData.start)} -{" "}
              {intervalData[interval].format(tooltipData.end)}
            </p>
          </div>
        </TooltipInPortal>
      )}
    </figure>
  );
};

// @ts-ignore
export default withScreenSize(BarChart);
