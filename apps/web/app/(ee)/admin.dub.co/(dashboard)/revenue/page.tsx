"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { AnalyticsLoadingSpinner } from "@/ui/analytics/analytics-loading-spinner";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { Badge, InfoTooltip, useRouterStuff } from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { cn, currencyFormatter, fetcher } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Fragment, Suspense, useMemo } from "react";
import useSWR from "swr";

const revenueTabs = [
  {
    id: "totalRevenue",
    label: "Total Revenue",
    colorClassName: "text-green-500 bg-green-500/50 border-green-500",
  },
  {
    id: "mrr",
    label: "MRR",
    colorClassName: "text-blue-500 bg-blue-500/50 border-blue-500",
  },
  {
    id: "payoutFees",
    label: "Payout Fees",
    labelTooltip:
      "Payout fees are computed based on a trailing 6-month rolling average.",
    colorClassName: "text-orange-500 bg-orange-500/50 border-orange-500",
  },
];

type RevenueTab = (typeof revenueTabs)[number]["id"];

function isRevenueTab(value: string): value is RevenueTab {
  return revenueTabs.some((tab) => tab.id === value);
}

export default function RevenuePage() {
  return (
    <Suspense>
      <RevenuePageClient />
    </Suspense>
  );
}

function RevenuePageClient() {
  const { getQueryString, queryParams, searchParamsObj } = useRouterStuff();
  const { interval, start, end, tab } = searchParamsObj;
  const selectedTab = isRevenueTab(tab) ? tab : "totalRevenue";

  const { data: { timeseries } = {}, isLoading } = useSWR<{
    timeseries: {
      date: Date;
      mrr: number;
      payoutFees: number;
      totalRevenue: number;
    }[];
  }>(`/api/admin/revenue${getQueryString()}`, fetcher, {
    keepPreviousData: true,
  });

  const previousPeriodQueryString = useMemo(() => {
    if (!timeseries || timeseries.length === 0) {
      return null;
    }

    const currentStart = new Date(timeseries[0].date);
    const currentEnd = new Date(timeseries[timeseries.length - 1].date);
    const periodDurationMs = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - periodDurationMs);

    const toDateParam = (date: Date) => date.toISOString().slice(0, 10);

    return getQueryString({
      start: toDateParam(previousStart),
      end: toDateParam(previousEnd),
    });
  }, [getQueryString, timeseries]);

  const {
    data: { timeseries: previousPeriodTimeseries } = {},
    isLoading: isPreviousPeriodLoading,
  } = useSWR<{
    timeseries: {
      date: Date;
      mrr: number;
      payoutFees: number;
      totalRevenue: number;
    }[];
  }>(
    previousPeriodQueryString
      ? `/api/admin/revenue${previousPeriodQueryString}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const chartData =
    timeseries?.map(({ date, ...values }) => ({
      date: new Date(date),
      values,
    })) ?? null;

  const totals = useMemo(() => {
    const finalMrr = timeseries?.[timeseries.length - 1]?.mrr ?? 0;
    const finalPayoutFees =
      timeseries?.[timeseries.length - 1]?.payoutFees ?? 0;
    return {
      totalRevenue: finalMrr + finalPayoutFees,
      mrr: finalMrr,
      payoutFees: finalPayoutFees,
    };
  }, [timeseries]);

  const percentChanges = useMemo(() => {
    const getPercentChange = (key: RevenueTab) => {
      if (!timeseries || timeseries.length === 0 || isPreviousPeriodLoading) {
        return 0;
      }

      if (!previousPeriodTimeseries || previousPeriodTimeseries.length === 0) {
        return 0;
      }

      const previousFinal =
        previousPeriodTimeseries[previousPeriodTimeseries.length - 1]?.[key] ??
        0;
      const currentFinal = timeseries[timeseries.length - 1]?.[key] ?? 0;

      if (previousFinal === 0) {
        return currentFinal === 0 ? 0 : 100;
      }

      return (currentFinal / previousFinal - 1) * 100;
    };

    return {
      totalRevenue: getPercentChange("totalRevenue"),
      mrr: getPercentChange("mrr"),
      payoutFees: getPercentChange("payoutFees"),
    };
  }, [isPreviousPeriodLoading, previousPeriodTimeseries, timeseries]);

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col space-y-6 p-6">
      <SimpleDateRangePicker defaultInterval="30d" className="w-fit" />
      <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        <div className="grid w-full grid-cols-1 divide-x sm:grid-cols-3">
          {revenueTabs.map(({ id, label, colorClassName, labelTooltip }) => (
            <button
              key={id}
              onClick={() =>
                queryParams({
                  set: { tab: id },
                })
              }
              className={cn(
                "border-box relative block h-full w-full flex-none px-4 py-3 text-left sm:px-8 sm:py-6",
                "transition-colors hover:bg-neutral-50 focus:outline-none active:bg-neutral-100",
                "ring-inset ring-neutral-500 focus-visible:ring-1",
              )}
            >
              {selectedTab === id && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full bg-black" />
              )}
              <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                <div
                  className={cn(
                    "h-2 w-2 rounded-sm bg-current shadow-[inset_0_0_0_1px_#00000019]",
                    colorClassName,
                  )}
                />
                <span>{label}</span>
                {labelTooltip ? <InfoTooltip content={labelTooltip} /> : null}
              </div>
              <div className="mt-1 flex h-12 items-center">
                {(totals[id] || totals[id] === 0) && !isLoading ? (
                  <div className="flex items-center gap-2">
                    <NumberFlow
                      value={(totals[id] ?? 0) / 100}
                      className="text-xl font-medium sm:text-3xl"
                      format={{
                        style: "currency",
                        currency: "USD",
                        // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                        trailingZeroDisplay: "stripIfInteger",
                      }}
                    />
                    {percentChanges[id] ? (
                      <Badge
                        variant={
                          percentChanges[id] >= 0
                            ? "green"
                            : percentChanges[id] < 0
                              ? "red"
                              : "neutral"
                        }
                        className="rounded-md px-2 py-1 text-xs"
                      >
                        {percentChanges[id] >= 0 ? "+" : ""}
                        {percentChanges[id].toFixed(1)}%
                      </Badge>
                    ) : null}
                  </div>
                ) : (
                  <div className="h-10 w-24 animate-pulse rounded-md bg-neutral-200" />
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="relative p-5 sm:p-10">
          <span className="absolute right-10 top-5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-600">
            All times in UTC
          </span>
          <div className="flex h-96 w-full items-center justify-center">
            {chartData ? (
              chartData.length > 0 ? (
                <TimeSeriesChart
                  data={chartData}
                  series={[
                    {
                      id: "totalRevenue",
                      valueAccessor: (d) => d.values.totalRevenue,
                      isActive: selectedTab === "totalRevenue",
                      colorClassName: revenueTabs[0].colorClassName,
                    },
                    {
                      id: "mrr",
                      valueAccessor: (d) => d.values.mrr,
                      isActive: selectedTab === "mrr",
                      colorClassName: revenueTabs[1].colorClassName,
                    },
                    {
                      id: "payoutFees",
                      valueAccessor: (d) => d.values.payoutFees,
                      isActive: selectedTab === "payoutFees",
                      colorClassName: revenueTabs[2].colorClassName,
                    },
                  ]}
                  tooltipClassName="p-0"
                  tooltipContent={(d) => {
                    const rows =
                      selectedTab === "totalRevenue"
                        ? revenueTabs
                        : revenueTabs.filter(({ id }) => id === selectedTab);
                    return (
                      <>
                        <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                          {formatDateTooltip(d.date, {
                            interval,
                            start,
                            end,
                            timezone: "UTC",
                          })}
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                          {rows.map(({ id, label, colorClassName }) => (
                            <Fragment key={id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "h-2 w-2 rounded-sm bg-current shadow-[inset_0_0_0_1px_#0003]",
                                    colorClassName,
                                  )}
                                />
                                <p className="text-neutral-600">{label}</p>
                              </div>
                              <p className="text-right font-medium text-neutral-900">
                                {currencyFormatter(d.values[id])}
                              </p>
                            </Fragment>
                          ))}
                        </div>
                      </>
                    );
                  }}
                >
                  <Areas />
                  <XAxis
                    maxTicks={5}
                    tickFormat={(date) =>
                      formatDateTooltip(date, {
                        interval,
                        start,
                        end,
                        timezone: "UTC",
                      })
                    }
                  />
                  <YAxis
                    showGridLines
                    tickFormat={(value) => currencyFormatter(value)}
                  />
                </TimeSeriesChart>
              ) : (
                <div className="text-center text-sm text-neutral-600">
                  No data available.
                </div>
              )
            ) : (
              <AnalyticsLoadingSpinner />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
