"use client";

import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { nFormatter } from "@dub/utils";
import { Fragment } from "react";

export default function RevenueClient({
  data,
}: {
  data: { date: Date; value: number }[];
}) {
  // take the last 12 months
  const chartData = data.slice(-12).map(({ date, value }) => ({
    date: new Date(date),
    values: {
      value,
    },
  }));

  const series = [
    {
      id: "value",
      valueAccessor: (d) => d.values.value,
      isActive: true,
      colorClassName: "text-teal-500",
    },
  ];

  const dateFormatter = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  const finalValue = data[data.length - 1].value;
  const previousValue = data[data.length - 2].value;
  const percentageDifference = (
    ((finalValue - previousValue) / previousValue) *
    100
  ).toFixed(0);

  return (
    <div className="mx-auto my-24 w-full max-w-screen-lg overflow-hidden border border-neutral-200 bg-white sm:rounded-xl">
      <div className="w-fit border-b-2 border-black px-8 py-6">
        <div className="flex items-center gap-2.5 text-sm text-neutral-600">
          <div className="h-2 w-2 rounded-sm bg-green-200 shadow-[inset_0_0_0_1px_#00000019]" />
          <span>Total Links</span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <h3 className="text-3xl font-medium">{nFormatter(finalValue)}</h3>
          <div className="rounded-lg bg-green-100 px-2 py-1.5 text-sm font-medium text-green-500">
            {Number(percentageDifference) > 0 ? "↑" : "↓"}
            <span className="ml-1">
              {nFormatter(Number(percentageDifference))}%
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-200 p-5 sm:p-10">
        <div className="flex h-96 w-full items-center justify-center">
          <TimeSeriesChart
            data={chartData}
            series={series}
            tooltipClassName="p-0"
            tooltipContent={(d) => (
              <>
                <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                  {dateFormatter(d.date)}
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                  <Fragment>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-sm bg-current bg-green-200 opacity-50 shadow-[inset_0_0_0_1px_#0003]" />
                      <p className="capitalize text-neutral-600">Total Links</p>
                    </div>
                    <p className="text-right font-medium text-neutral-900">
                      {nFormatter(d.values.value)}
                    </p>
                  </Fragment>
                </div>
              </>
            )}
          >
            <Areas />
            <XAxis maxTicks={5} tickFormat={dateFormatter} />
            <YAxis showGridLines tickFormat={nFormatter} />
          </TimeSeriesChart>
        </div>
      </div>
    </div>
  );
}
