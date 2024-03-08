import { ScaleTypeToD3Scale } from "@visx/scale";
import { ReactElement } from "react";

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
  accessorFn: AccessorFn<T, TValue>;
  color?: string | AccessorFn<T, string>;
};

export type Data<T extends Datum> = TimeSeriesDatum<T>[];

export type ChartContext<T extends Datum = any> = {
  data: Data<T>;
  series: Series<T>[];

  tickFormat?: (date: Date) => string;

  tooltipContent?: (datum: TimeSeriesDatum<T>) => ReactElement;

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

  maxTicks?: number;

  // Props determined by AreaChartInner

  width: number;
  height: number;
  xScale: ScaleTypeToD3Scale<number>["utc"];
  yScale: ScaleTypeToD3Scale<number>["linear"];
};
