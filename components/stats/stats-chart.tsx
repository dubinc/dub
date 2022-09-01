import { useMemo, useState } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { scaleBand, scaleLinear } from "@visx/scale";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { withScreenSize } from "@visx/responsive";
import {
  RawStatsProps,
  IntervalProps,
  processData,
  rangeFormatter,
} from "@/lib/stats";
import { intervalData } from "@/lib/stats";
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

const StatsChart = ({
  _key,
  stats,
  screenWidth,
  screenHeight,
}: {
  _key: string;
  stats: RawStatsProps[];
  screenWidth?: number;
  screenHeight?: number;
}) => {
  const data = mock;

  const [CHART_WIDTH, CHART_HEIGHT] = useMemo(() => {
    const width = screenWidth
      ? Math.min(screenWidth * 0.7, CHART_MAX_WIDTH)
      : CHART_MAX_WIDTH;
    const height = screenHeight
      ? Math.min(screenHeight * 0.4, CHART_MAX_HEIGHT)
      : CHART_MAX_HEIGHT;
    return [width, height];
  }, [screenWidth, screenHeight]);

  const router = useRouter();
  const interval = (router.query.period as IntervalProps) || "7d";

  const { clicksData, geoData } = useMemo(() => {
    return processData(data, interval);
  }, [data, interval]);

  const xScale = useMemo(() => {
    return scaleBand({
      range: [0, CHART_WIDTH],
      domain: clicksData.map((d) => d.start),
      padding: 0.4,
    });
  }, [data, interval]);

  const yScale = useMemo(() => {
    return scaleLinear({
      range: [CHART_HEIGHT, 0],
      domain: [0, rangeFormatter(Math.max(...clicksData.map((d) => d.count)))],
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
    debounce: { scroll: 500, resize: 2000 },
  });

  let tooltipTimeout: number | undefined;

  return (
    <div className="bg-white dark:bg-black p-10 pr-20 shadow-lg dark:shadow-none rounded-lg border border-gray-100 dark:border-gray-600">
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
              fontSize: 14,
              textAnchor: "start",
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
              fontSize: 12,
              textAnchor: "middle",
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
          {clicksData.map(({ start, end, count }) => {
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
                  console.log(left);
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
              <h3 className="text-black dark:text-white my-1">
                <span className="text-2xl font-semibold">
                  {nFormatter(tooltipData.count)}
                </span>{" "}
                clicks
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {intervalData[interval].format(tooltipData.start)} -{" "}
                {intervalData[interval].format(tooltipData.end)}
              </p>
            </div>
          </TooltipInPortal>
        )}
      </figure>
    </div>
  );
};

// @ts-ignore
export default withScreenSize(StatsChart);

const mock = [
  {
    geo: {
      city: "San Francisco",
      region: "CA",
      country: "US",
      latitude: "37.7695",
      longitude: "-122.385",
    },
    ua: {
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661737363508,
  },
  {
    geo: {
      city: "San Francisco",
      region: "CA",
      country: "US",
      latitude: "37.7695",
      longitude: "-122.385",
    },
    ua: {
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661737363608,
  },
  {
    geo: {
      city: "San Francisco",
      region: "CA",
      country: "US",
      latitude: "37.7695",
      longitude: "-122.385",
    },
    ua: {
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661737363908,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661757572391,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "curl/7.77.0",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661757801308,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "curl/7.77.0",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661757805125,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "curl/7.77.0",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661757810830,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "curl/7.77.0",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661871209000,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "curl/7.77.0",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661871210000,
  },
];
