import { cn, nFormatter } from "@dub/utils";
import { curveBasis } from "@visx/curve";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { Area } from "@visx/shape";
import { Text } from "@visx/text";
import { motion } from "framer-motion";
import { Fragment, useCallback, useContext, useMemo, useState } from "react";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";

const steps = [
  {
    id: "clicks",
    label: "Clicks",
    colorClassName: "text-blue-600",
  },
  {
    id: "leads",
    label: "Leads",
    colorClassName: "text-violet-600",
  },
  {
    id: "sales",
    label: "Sales",
    colorClassName: "text-teal-400",
  },
];

const layers = [
  {
    opacity: 1,
    padding: 0,
  },
  {
    opacity: 0.3,
    padding: 8,
  },
  {
    opacity: 0.15,
    padding: 16,
  },
];

const maxLayerPadding = 16;
const chartPadding = 40;

export function AnalyticsFunnelChart() {
  return (
    // p-5 pt-10 sm:p-10
    <div className="flex h-[444px] w-full items-center justify-center sm:h-[464px]">
      <ParentSize className="relative">
        {({ width, height }) =>
          width && height ? (
            <AnalyticsFunnelChartInner width={width} height={height} />
          ) : null
        }
      </ParentSize>
    </div>
  );
}

export function AnalyticsFunnelChartInner({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const { totalEvents } = useContext(AnalyticsContext);

  const [tooltip, setTooltip] = useState<string | null>(null);
  const tooltipStep = steps.find(({ id }) => id === tooltip);

  const stepValue = useCallback(
    (step: string) => totalEvents?.[step] ?? 0,
    [totalEvents],
  );

  const data = useMemo(() => {
    return Object.fromEntries(
      steps.map(({ id }, idx) => {
        const current = stepValue(id);
        const next = stepValue(
          steps[idx + 1]?.id ?? steps[steps.length - 1].id,
        );
        return [id, interpolate(current, next)];
      }),
    );
  }, [stepValue]);

  const zeroData = useMemo(() => interpolate(0, 0), [steps]);

  const maxValue = useMemo(
    () => Math.max(...steps.map((step) => stepValue(step.id))),
    [stepValue],
  );

  const xScale = scaleLinear({
    domain: [0, steps.length],
    range: [0, width],
  });

  const yScale = scaleLinear({
    domain: [maxValue, -maxValue],
    range: [
      height - maxLayerPadding - chartPadding,
      maxLayerPadding + chartPadding,
    ],
  });

  return totalEvents ? (
    <div className="relative">
      <svg width={width} height={height}>
        {steps.map(({ id, colorClassName }, idx) => (
          <Fragment key={id}>
            {/* Background */}
            <rect
              x={xScale(idx)}
              y={0}
              width={width / steps.length}
              height={height}
              className="fill-transparent transition-colors hover:fill-blue-600/5"
              onPointerEnter={() => setTooltip(id)}
              onPointerLeave={() => setTooltip(null)}
            />
            {/* Divider line */}
            <line
              x1={xScale(idx)}
              y1={0}
              x2={xScale(idx)}
              y2={height}
              className="stroke-black/10"
            />

            {/* Funnel */}
            {layers.map(({ opacity, padding }) => (
              <Area
                data={data[id]}
                curve={curveBasis}
                x={(d) => xScale(idx + d.x)}
                y0={(d) => yScale(-d.y) - padding}
                y1={(d) => yScale(d.y) + padding}
              >
                {({ path }) => {
                  return (
                    <motion.path
                      initial={{ d: path(zeroData) || "", opacity: 0 }}
                      animate={{ d: path(data[id]) || "", opacity }}
                      className={cn(colorClassName, "pointer-events-none")}
                      fill="currentColor"
                    />
                  );
                }}
              </Area>
            ))}

            {/* Percentage */}
            {totalEvents && (
              <Text
                x={(xScale(idx) + xScale(idx + 1)) / 2}
                y={height / 2}
                textAnchor="middle"
                verticalAnchor="middle"
                fill="white"
                fontSize={16}
                className="pointer-events-none"
              >
                {formatPercentage((totalEvents?.[id] / maxValue) * 100) + "%"}
              </Text>
            )}
          </Fragment>
        ))}
      </svg>
      {tooltipStep && (
        <div
          key={tooltipStep.id}
          className="animate-slide-up-fade pointer-events-none absolute top-12 flex items-center justify-center pb-4"
          style={{
            left: xScale(steps.findIndex(({ id }) => id === tooltipStep.id)),
            width: width / steps.length,
          }}
        >
          <div
            className={cn(
              "rounded-lg border border-gray-200 bg-white text-base shadow-sm",
            )}
          >
            <p className="border-b border-gray-200 px-4 py-3 text-sm text-gray-900">
              {tooltipStep.label}
            </p>
            <div className="xs:grid-cols-2 grid grid-cols-1 gap-x-6 gap-y-2 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    tooltipStep.colorClassName,
                    "h-2 w-2 shrink-0 rounded-sm bg-current opacity-50 shadow-[inset_0_0_0_1px_#0003]",
                  )}
                />
                <p className="whitespace-nowrap capitalize text-gray-600">
                  {formatPercentage(
                    (stepValue(tooltipStep.id) / maxValue) * 100,
                  ) + "%"}
                </p>
              </div>
              <p className="xs:text-right font-medium text-gray-900">
                {nFormatter(stepValue(tooltipStep.id))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="flex h-full w-full items-center justify-center">
      <AnalyticsLoadingSpinner />
    </div>
  );
}

const formatPercentage = (value: number) =>
  value > 0 && value < 1 ? "< 1" : nFormatter(value, { digits: 2 });

const interpolate = (from: number, to: number) => [
  { x: 0, y: from },
  { x: 0.3, y: from },
  { x: 0.5, y: (from + to) / 2 },
  { x: 0.7, y: to },
  { x: 1, y: to },
];
