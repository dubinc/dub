import { localPoint } from "@visx/event";
import {
  TooltipWithBounds,
  useTooltipInPortal,
  useTooltip as useVisxTooltip,
} from "@visx/tooltip";
import { bisector } from "d3-array";
import { useCallback, useEffect, useMemo } from "react";
import {
  ChartContext,
  ChartTooltipContext,
  Datum,
  Series,
  TimeSeriesDatum,
} from "./types";

const bisectDate = bisector<Datum, Date>((d) => new Date(d.date)).left;

export type TooltipOptions<T extends Datum> = {
  seriesId?: Series["id"];
  chartContext: ChartContext<T>;
  renderInPortal?: boolean;
  snapToX?: boolean;
  snapToY?: boolean;
  defaultIndex?: number;
};

export function useTooltip<T extends Datum>({
  seriesId,
  chartContext,
  renderInPortal = false,
  snapToY = false,
  snapToX = true,
  defaultIndex,
}: TooltipOptions<T>): ChartTooltipContext {
  const { series, data, xScale, yScale, margin } = chartContext;

  const visxTooltipInPortal = useTooltipInPortal({
    scroll: true,
    detectBounds: true,
    debounce: 200,
  });

  const defaultTooltipDatum =
    defaultIndex !== undefined ? data[defaultIndex] : undefined;

  const defaultTooltipData = useMemo(
    () =>
      defaultTooltipDatum !== undefined
        ? {
            tooltipData: defaultTooltipDatum,
            tooltipLeft: snapToX ? xScale(defaultTooltipDatum.date) : 0,
            tooltipTop: snapToY
              ? yScale(
                  series
                    .find((s) => s.id === seriesId)!
                    .valueAccessor(defaultTooltipDatum),
                )
              : 0,
          }
        : undefined,
    [defaultTooltipDatum, snapToX, snapToY, xScale, yScale, series, seriesId],
  );

  const visxTooltip = useVisxTooltip<TimeSeriesDatum<T>>();

  useEffect(() => {
    if (defaultTooltipData) visxTooltip.showTooltip(defaultTooltipData);
  }, [defaultTooltipData]);

  const handleTooltip = useCallback(
    (
      event:
        | React.TouchEvent<SVGRectElement>
        | React.MouseEvent<SVGRectElement>,
    ) => {
      const lp = localPoint(event) || { x: 0 };
      const x = lp.x - margin.left;
      const x0 =
        "invert" in xScale
          ? xScale.invert(x)
          : (xScale.domain()[
              Math.round((x - xScale.step() * 0.75) / xScale.step())
            ] as Date | undefined);

      if (x0 === undefined) {
        console.log("x0 is undefined", { defaultTooltipData });
        if (defaultTooltipData) visxTooltip.showTooltip(defaultTooltipData);
        else visxTooltip.hideTooltip();
        return;
      }
      const index = bisectDate(data, x0, 1);
      const d0 = data[index - 1];
      const d1 = data[index];
      let d = d0;
      if (d1?.date) {
        d =
          x0.valueOf() - d0.date.valueOf() > d1.date.valueOf() - x0.valueOf()
            ? d1
            : d0;
      }
      visxTooltip.showTooltip({
        tooltipData: d,
        tooltipLeft: snapToX ? xScale(d.date) : x,
        tooltipTop: snapToY
          ? yScale(series.find((s) => s.id === seriesId)!.valueAccessor(d))
          : 0,
      });
    },
    [
      seriesId,
      data,
      xScale,
      yScale,
      series,
      defaultTooltipData,
      visxTooltip.showTooltip,
    ],
  );

  const TooltipWrapper = renderInPortal
    ? visxTooltipInPortal.TooltipInPortal
    : TooltipWithBounds;

  return {
    handleTooltip,
    TooltipWrapper,
    containerRef: visxTooltipInPortal.containerRef,
    ...visxTooltip,
    hideTooltip: () =>
      defaultTooltipData
        ? visxTooltip.showTooltip(defaultTooltipData)
        : visxTooltip.hideTooltip(),
  };
}
