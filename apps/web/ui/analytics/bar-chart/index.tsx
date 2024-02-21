import { ReactNode, useCallback, useMemo } from "react";
import { useMediaQuery } from "@dub/ui";
import { nFormatter } from "@dub/utils";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { scaleBand, scaleLinear } from "@visx/scale";
import { localPoint } from "@visx/event";
import { Group } from "@visx/group";
import { max } from "@visx/vendor/d3-array";
import { GridRows } from "@visx/grid";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { motion } from "framer-motion";
import colors from "tailwindcss/colors";
import NoChartData from "./no-data";
import TooltipWithArrow from "./tooltip-with-arrow";

type BarData = { date: Date; value: number };

type Props = {
  data: BarData[];
  width: number;
  height: number;
  tooltipContent: (props: {
    data: TooltipData;
    formatTimestamp: (d: Date) => string;
  }) => ReactNode;
  interval?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
};

type TooltipData = {
  value: number;
  start: Date;
  end: Date;
};

// constants
const LEFT_AXIS_MIN_NUM_OF_TICKS = 5;

// utils
const getMaxValueForLeftAxisDomainRange = (data: BarData[]) => {
  const maxV = max(data, getValue) ?? 0;

  // Ensure a constant number of ticks is always displayed when all data values are below a certain threshold.
  // For instance, this will display 5 ticks on the left axis, even if all data values are zero.
  if (maxV < LEFT_AXIS_MIN_NUM_OF_TICKS) {
    return LEFT_AXIS_MIN_NUM_OF_TICKS;
  }

  // Make sure the highest tick value is consistently rounded up to the next multiple of a fixed constant.
  // E.g. if the maximum value is 15, the top tick will be 15; if the maximum value is 17, the top tick will be 20.
  // This ensures that all bars are fully accommodated within the chart in terms of height.
  return (
    Math.ceil(maxV / LEFT_AXIS_MIN_NUM_OF_TICKS) * LEFT_AXIS_MIN_NUM_OF_TICKS
  );
};

// accessors
const getDate = (d: BarData) => d.date;
const getValue = (d: BarData) => d.value;

// defaults
const defaultMargin = { top: 40, right: 30, bottom: 50, left: 40 };

// colors
const axisStrokeColor = colors.gray[600];
const axisFillColor = colors.gray[600];
const gridFillColor = colors.gray[300];

// variables
let tooltipTimeout: number;

export default function BarChart({
  data,
  interval,
  tooltipContent: getTooltipContent,
  height,
  width,
  margin = defaultMargin,
}: Props) {
  const { isMobile } = useMediaQuery();

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

  // bounds
  const xMax = Math.max(width - margin.left - margin.right, 0);
  const yMax = Math.max(height - margin.top - margin.bottom, 0);

  const formatTimestamp = useCallback(
    (e: Date) => {
      switch (interval) {
        case "1h":
          return new Date(e).toLocaleTimeString("en-us", {
            hour: "numeric",
            minute: "numeric",
          });
        case "24h":
          return new Date(e)
            .toLocaleDateString("en-us", {
              month: "short",
              day: "numeric",
              hour: "numeric",
            })
            .replace(",", " ");
        case "90d":
        case "all":
          return new Date(e).toLocaleDateString("en-us", {
            month: "short",
            year: "numeric",
          });
        default:
          return new Date(e).toLocaleDateString("en-us", {
            month: "short",
            day: "numeric",
          });
      }
    },
    [interval],
  );

  const dateScale = useMemo(
    () =>
      scaleBand<Date>({
        domain: data.map(getDate),
        padding: 0.2,
      }),
    [data],
  );
  const valueScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, getMaxValueForLeftAxisDomainRange(data)],
        nice: true,
        round: true,
      }),
    [data],
  );

  dateScale.rangeRound([0, xMax]);
  valueScale.range([yMax, 0]);

  if (data.length === 0) {
    return <NoChartData />;
  }

  if (width < 200) {
    return null;
  }

  return (
    <figure>
      <svg ref={containerRef} width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <GridRows
            numTicks={5}
            scale={valueScale}
            width={xMax}
            height={yMax}
            stroke={gridFillColor}
          />
          <AxisBottom
            hideAxisLine
            hideTicks
            numTicks={5}
            top={yMax}
            scale={dateScale}
            tickFormat={formatTimestamp}
            stroke={axisStrokeColor}
            tickStroke={axisStrokeColor}
            tickLabelProps={{
              fill: axisFillColor,
              fontSize: isMobile ? 10 : 12,
              textAnchor: "middle",
              angle: isMobile ? -45 : 0,
              verticalAnchor: isMobile ? "start" : "end",
            }}
          />
          <AxisLeft
            hideAxisLine
            hideTicks
            numTicks={5}
            stroke={axisStrokeColor}
            tickStroke={axisStrokeColor}
            scale={valueScale}
            tickFormat={(d) => nFormatter(d as number)}
            tickLabelProps={{
              fill: axisFillColor,
              fontSize: isMobile ? 10 : 12,
            }}
          />
          {data.map(({ date, value }, idx) => {
            const barWidth = dateScale.bandwidth();
            const barHeight = yMax - (valueScale(value) ?? 0);
            const barX = dateScale(date) ?? 0;
            const barY = yMax - barHeight;

            return (
              <motion.rect
                key={`bar-${value}-${date.toISOString()}`}
                transition={{ ease: "easeOut", duration: 0.3 }}
                className="!origin-bottom fill-[#2563eb]"
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
                  // is what containerRef is set to.
                  const eventSvgCoords = localPoint(event);

                  // center horizontally the tooltip by its bar
                  const left = barX + barWidth / 2 - 45;
                  // raise the tooltip above the mouse cursor
                  const top = eventSvgCoords
                    ? eventSvgCoords.y - 100
                    : undefined;

                  showTooltip({
                    tooltipData: {
                      value,
                      start: date,
                      end: data[idx + 1]?.date ?? new Date(),
                    },
                    tooltipTop: top,
                    tooltipLeft: left,
                  });
                }}
              />
            );
          })}
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithArrow
          component={TooltipInPortal}
          top={tooltipTop}
          left={tooltipLeft}
        >
          {getTooltipContent({
            data: tooltipData,
            formatTimestamp,
          })}
        </TooltipWithArrow>
      )}
    </figure>
  );
}
