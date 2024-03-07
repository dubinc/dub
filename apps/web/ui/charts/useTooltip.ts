import { localPoint } from "@visx/event";
import {
  TooltipWithBounds,
  defaultStyles,
  useTooltipInPortal,
  useTooltip as useVisxTooltip,
} from "@visx/tooltip";
import { bisector } from "d3-array";
import { useCallback } from "react";
import { ChartContext, Datum, Series, TimeSeriesDatum } from "./types";

const bisectDate = bisector<Datum, Date>((d) => new Date(d.date)).left;

export type TooltipOptions = {
  renderInPortal?: boolean;
  snapToX?: boolean;
  snapToY?: boolean;
};

export function useTooltip<T extends Datum>({
  seriesId,
  chartContext,
  renderInPortal = false,
  snapToY = false,
  snapToX = true,
}: {
  seriesId?: Series["id"];
  chartContext: ChartContext<T>;
} & TooltipOptions) {
  const { series, data, xScale, yScale } = chartContext;

  const visxTooltipInPortal = useTooltipInPortal({
    scroll: true,
    detectBounds: true,
    debounce: 200,
  });

  const visxTooltip = useVisxTooltip<TimeSeriesDatum<T>>();

  const handleTooltip = useCallback(
    (
      event:
        | React.TouchEvent<SVGRectElement>
        | React.MouseEvent<SVGRectElement>,
    ) => {
      const { x } = localPoint(event) || { x: 0 };
      const x0 = xScale.invert(x);
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
          ? yScale(series.find((s) => s.id === seriesId)!.accessorFn(d))
          : 0,
      });
    },
    [seriesId, data, xScale, yScale, series, visxTooltip.showTooltip],
  );

  const TooltipWrapper = renderInPortal
    ? visxTooltipInPortal.TooltipInPortal
    : TooltipWithBounds;

  return {
    handleTooltip,
    TooltipWrapper,
    containerRef: visxTooltipInPortal.containerRef,
    defaultStyles,
    ...visxTooltip,
  };
}
