import { ScaleTypeToD3Scale } from "@visx/scale";
import { TooltipWithBounds } from "@visx/tooltip";
import { UseTooltipParams } from "@visx/tooltip/lib/hooks/useTooltip";
import { TooltipInPortalProps } from "@visx/tooltip/lib/hooks/useTooltipInPortal";
import { Dispatch, FC, ReactElement, SetStateAction } from "react";

export type Datum = Record<string, any>;

export type TimeSeriesDatum<T extends Datum = any> = {
  date: Date;
  values: T;
};

export type AccessorFn<T extends Datum, TValue = number> = (
  datum: TimeSeriesDatum<T>,
) => TValue;

export type Series<T extends Datum = any, TValue = number> = {
  id: string;
  isActive?: boolean;
  valueAccessor: AccessorFn<T, TValue>;
  colorClassName?: string;
};

export type Data<T extends Datum> = TimeSeriesDatum<T>[];

type ChartRequiredProps<T extends Datum = any> = {
  data: Data<T>;
  series: Series<T>[];
};

type ChartOptionalProps<T extends Datum = any> = {
  type?: "area" | "bar";
  tooltipContent?: (datum: TimeSeriesDatum<T>) => ReactElement | string;
  tooltipClassName?: string;

  /**
   * Absolute pixel values for margins around the chart area.
   * Default values accommodate axis labels and other expected overflow.
   */
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  /**
   * Decimal percentages for padding above and below highest and lowest y-values
   */
  padding?: {
    top: number;
    bottom: number;
  };
};

export type ChartProps<T extends Datum = any> = ChartRequiredProps<T> &
  ChartOptionalProps<T>;

export type ChartContext<T extends Datum = any> = Required<ChartProps<T>> & {
  width: number;
  height: number;
  startDate: Date;
  endDate: Date;
  xScale:
    | ScaleTypeToD3Scale<number>["utc"]
    | ScaleTypeToD3Scale<number>["band"];
  yScale: ScaleTypeToD3Scale<number>["linear"];
  minY: number;
  maxY: number;
  leftAxisMargin?: number;
  setLeftAxisMargin: Dispatch<SetStateAction<number | undefined>>;
};

export type ChartTooltipContext<T extends Datum = any> = {
  handleTooltip: (
    event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>,
  ) => void;
  TooltipWrapper: FC<TooltipInPortalProps> | typeof TooltipWithBounds;
  containerRef: (element: SVGElement | HTMLElement | null) => void;
} & UseTooltipParams<TimeSeriesDatum<T>>;
