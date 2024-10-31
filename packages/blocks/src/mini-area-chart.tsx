import { curveNatural } from "@visx/curve";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleUtc } from "@visx/scale";
import { Area, AreaClosed } from "@visx/shape";
import { motion } from "framer-motion";
import { useId, useMemo } from "react";

export type MiniAreaChartProps = {
  data: { date: Date; value: number }[];
  curve?: boolean;
};

export function MiniAreaChart(props: MiniAreaChartProps) {
  return (
    <ParentSize className="relative">
      {({ width, height }) => {
        return (
          width > 0 &&
          height > 0 && <MiniAreaChartInner {...{ width, height, ...props }} />
        );
      }}
    </ParentSize>
  );
}

const padding = { top: 8, right: 2, bottom: 2, left: 2 };

function MiniAreaChartInner({
  width,
  height,
  data,
  curve = true,
}: MiniAreaChartProps & { width: number; height: number }) {
  const id = useId();

  const zeroedData = useMemo(
    () =>
      data.map(({ date }) => ({
        date,
        value: 0,
      })),
    [data],
  );

  const { yScale, xScale } = useMemo(() => {
    const values = data.map(({ value }) => value);
    const maxY = Math.max(...values);

    const dateTimes = data.map(({ date }) => date.getTime());
    const minDate = new Date(Math.min(...dateTimes));
    const maxDate = new Date(Math.max(...dateTimes));

    return {
      yScale: scaleLinear<number>({
        domain: [-2, Math.max(maxY, 2)],
        range: [height - padding.top - padding.bottom, 0],
        nice: true,
        clamp: true,
      }),
      xScale: scaleUtc<number>({
        domain: [minDate, maxDate],
        range: [0, width - padding.left - padding.right],
        nice: true,
      }),
    };
  }, [data, height, width]);

  return (
    <svg width={width} height={height} key={data.length}>
      <defs>
        <LinearGradient
          id={`${id}-color-gradient`}
          from="#7D3AEC"
          to="#DA2778"
          x1={0}
          x2={width - padding.left - padding.right}
          gradientUnits="userSpaceOnUse"
        />
        <LinearGradient
          id={`${id}-mask-gradient`}
          from="white"
          to="white"
          fromOpacity={0.3}
          toOpacity={0}
          x1={0}
          x2={0}
          y1={0}
          y2={1}
        />
        <mask id={`${id}-mask`} maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill={`url(#${id}-mask-gradient)`} />
        </mask>
      </defs>
      <Group left={padding.left} top={padding.top}>
        <Area
          data={data}
          x={({ date }) => xScale(date)}
          y={({ value }) => yScale(value) ?? 0}
          curve={curve ? curveNatural : undefined}
        >
          {({ path }) => {
            return (
              <motion.path
                initial={{ d: path(zeroedData) || "", opacity: 0 }}
                animate={{ d: path(data) || "", opacity: 1 }}
                strokeWidth={1.5}
                stroke={`url(#${id}-color-gradient)`}
              />
            );
          }}
        </Area>

        <AreaClosed
          data={data}
          x={({ date }) => xScale(date)}
          y={({ value }) => yScale(value) ?? 0}
          yScale={yScale}
          curve={curve ? curveNatural : undefined}
        >
          {({ path }) => {
            return (
              <motion.path
                initial={{ d: path(zeroedData) || "", opacity: 0 }}
                animate={{ d: path(data) || "", opacity: 1 }}
                fill={`url(#${id}-color-gradient)`}
                mask={`url(#${id}-mask)`}
              />
            );
          }}
        </AreaClosed>
      </Group>
    </svg>
  );
}
