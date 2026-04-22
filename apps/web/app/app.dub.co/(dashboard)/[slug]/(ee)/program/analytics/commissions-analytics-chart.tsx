"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import {
  Areas,
  ChartContext,
  TimeSeriesChart,
  XAxis,
  YAxis,
} from "@dub/ui/charts";
import { currencyFormatter } from "@dub/utils";
import { LinearGradient } from "@visx/gradient";
import { useId, useMemo } from "react";
import {
  CommissionStatusFilter,
  MOCK_COMMISSIONS_TIMESERIES,
} from "./commissions-mock-data";

const STATUS_COLORS: Record<
  CommissionStatusFilter,
  { className: string; from: string; to: string }
> = {
  pending: {
    className: "text-orange-500",
    from: "#f97316",
    to: "#fb923c",
  },
  processed: {
    className: "text-blue-500",
    from: "#3b82f6",
    to: "#60a5fa",
  },
  paid: {
    className: "text-green-500",
    from: "#22c55e",
    to: "#4ade80",
  },
};

export function CommissionsAnalyticsChart({
  status,
}: {
  status: CommissionStatusFilter;
}) {
  const id = useId();
  const color = STATUS_COLORS[status];

  const data = useMemo(
    () =>
      MOCK_COMMISSIONS_TIMESERIES.map((d) => ({
        date: new Date(d.start),
        values: {
          amount: d[status],
        },
      })),
    [status],
  );

  return (
    <TimeSeriesChart
      key={status}
      data={data}
      series={[
        {
          id: "amount",
          valueAccessor: (d) => d.values.amount,
          colorClassName: color.className,
          isActive: true,
        },
      ]}
      tooltipClassName="p-0"
      tooltipContent={(d) => (
        <>
          <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
            {formatDateTooltip(d.date, {})}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={[
                  "h-2 w-2 rounded-sm shadow-[inset_0_0_0_1px_#0003]",
                  `bg-current ${color.className}`,
                ].join(" ")}
              />
              <p className="capitalize text-neutral-600">{status}</p>
            </div>
            <p className="text-right font-medium text-neutral-900">
              {currencyFormatter(d.values.amount)}
            </p>
          </div>
        </>
      )}
    >
      <ChartContext.Consumer>
        {(ctx) => (
          <LinearGradient
            id={`${id}-color-gradient`}
            from={color.from}
            to={color.to}
            x1={0}
            x2={ctx?.width ?? 1}
            gradientUnits="userSpaceOnUse"
          />
        )}
      </ChartContext.Consumer>
      <XAxis tickFormat={(date) => formatDateTooltip(date, {})} maxTicks={2} />
      <YAxis showGridLines tickFormat={currencyFormatter} />
      <Areas />
    </TimeSeriesChart>
  );
}
