"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { ApplicationEventStages } from "@/lib/types";
import { ToggleGroup, useRouterStuff } from "@dub/ui";
import {
  Areas,
  FunnelChart,
  TimeSeriesChart,
  XAxis,
  YAxis,
} from "@dub/ui/charts";
import { ChartLine, Filter2, LoadingSpinner } from "@dub/ui/icons";
import { capitalize, cn } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  useApplicationsAnalytics,
  useApplicationsAnalyticsCount,
} from "./use-applications-analytics";
import { ApplicationsView } from "./use-applications-analytics-query";

const STAGE_COLOR: Record<ApplicationEventStages, string> = {
  visited: "text-blue-500",
  started: "text-violet-600",
  submitted: "text-pink-500",
  approved: "text-teal-400",
};

const STAGE_KEY: Record<
  ApplicationEventStages,
  "visits" | "starts" | "submissions" | "approvals"
> = {
  visited: "visits",
  started: "starts",
  submitted: "submissions",
  approved: "approvals",
};

export function ApplicationsFunnelChart({
  stage,
  view,
}: {
  stage: ApplicationEventStages;
  view: ApplicationsView;
}) {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { data, error, isLoading } = useApplicationsAnalyticsCount();

  const { data: timeseries, error: timeseriesError } = useApplicationsAnalytics(
    {
      groupBy: "timeseries",
    },
  );

  const steps = useMemo(
    () => [
      {
        id: "visited",
        value: data?.visits ?? 0,
        colorClassName: "text-blue-600",
      },
      {
        id: "started",
        value: data?.starts ?? 0,
        colorClassName: "text-violet-600",
      },
      {
        id: "submitted",
        value: data?.submissions ?? 0,
        colorClassName: "text-pink-500",
      },
      {
        id: "approved",
        value: data?.approvals ?? 0,
        colorClassName: "text-teal-400",
      },
    ],
    [data],
  );

  const stageKey = STAGE_KEY[stage];
  const colorClassName = STAGE_COLOR[stage] ?? "text-violet-500";

  const chartData = timeseries?.map((row) => ({
    date: new Date(row.start),
    values: { amount: row[stageKey] },
  }));

  return (
    <div>
      <div className="border-b border-neutral-200">
        <div className="grid w-full grid-cols-4 divide-x divide-neutral-200 overflow-y-hidden">
          <NumberFlowGroup>
            {(
              [
                {
                  id: "visited",
                  colorClassName: "text-blue-500/50",
                  value: data?.visits,
                },
                {
                  id: "started",
                  colorClassName: "text-violet-600/50",
                  value: data?.starts,
                },
                {
                  id: "submitted",
                  colorClassName: "text-pink-500/50",
                  value: data?.submissions,
                },
                {
                  id: "approved",
                  colorClassName: "text-teal-400/50",
                  value: data?.approvals,
                },
              ] as const
            ).map(({ id, colorClassName, value }, idx) => (
              <div key={id} className="relative z-0">
                {idx > 0 && (
                  <div className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-1.5">
                    <ChevronRight
                      className="h-3 w-3 text-neutral-400"
                      strokeWidth={2.5}
                    />
                  </div>
                )}
                <Link
                  className={cn(
                    "border-box relative block h-full min-w-[110px] flex-none px-4 py-3 sm:min-w-[240px] sm:px-8 sm:py-6",
                    "transition-colors hover:bg-neutral-50 focus:outline-none active:bg-neutral-100",
                    "ring-inset ring-neutral-500 focus-visible:ring-1",
                  )}
                  href={
                    queryParams({
                      set: { applicationEvent: id },
                      del: "page",
                      scroll: false,
                      getNewPath: true,
                    }) as string
                  }
                  aria-current={stage === id ? "page" : undefined}
                >
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 h-0.5 w-full bg-black transition-transform duration-100",
                      stage !== id && "translate-y-[3px]",
                    )}
                  />
                  <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-sm bg-current shadow-[inset_0_0_0_1px_#00000019]",
                        colorClassName,
                      )}
                    />
                    <span className="capitalize">{STAGE_KEY[id]}</span>
                  </div>
                  <div className="mt-1 flex h-12 items-center">
                    {value || value === 0 ? (
                      <NumberFlow
                        value={value}
                        className="text-xl font-medium sm:text-3xl"
                        format={{
                          notation: value > 999999 ? "compact" : "standard",
                        }}
                      />
                    ) : (
                      <div className="h-9 w-16 animate-pulse rounded-md bg-neutral-200" />
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </NumberFlowGroup>
        </div>
      </div>

      <div className="relative h-72 md:h-96">
        {isLoading ? (
          <div className="flex size-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : error || timeseriesError ? (
          <div className="flex size-full items-center justify-center text-sm text-neutral-500">
            Failed to load data
          </div>
        ) : (
          <>
            {view === "timeseries" ? (
              <div className="relative size-full p-6 pt-10">
                <TimeSeriesChart
                  data={chartData || []}
                  series={[
                    {
                      id: "amount",
                      valueAccessor: (d) => d.values.amount,
                      colorClassName,
                      isActive: true,
                    },
                  ]}
                  tooltipClassName="p-0"
                  tooltipContent={(d) => (
                    <>
                      <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                        {formatDateTooltip(d.date, {
                          interval: searchParamsObj.interval,
                          start: searchParamsObj.start,
                          end: searchParamsObj.end,
                          timezone:
                            Intl.DateTimeFormat().resolvedOptions().timeZone,
                        })}
                      </p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              colorClassName,
                              "h-2 w-2 rounded-sm bg-current opacity-50 shadow-[inset_0_0_0_1px_#0003]",
                            )}
                          />
                          <p className="capitalize text-neutral-600">
                            {STAGE_KEY[stage]}
                          </p>
                        </div>
                        <p className="text-right font-medium text-neutral-900">
                          <NumberFlow value={d.values.amount} />
                        </p>
                      </div>
                    </>
                  )}
                >
                  <Areas />
                  <XAxis
                    tickFormat={(date) =>
                      formatDateTooltip(date, {
                        interval: searchParamsObj.interval,
                        start: searchParamsObj.start,
                        end: searchParamsObj.end,
                      })
                    }
                    maxTicks={2}
                  />
                  <YAxis showGridLines />
                </TimeSeriesChart>
              </div>
            ) : (
              <FunnelChart
                steps={steps.map((step) => ({
                  ...step,
                  label: capitalize(STAGE_KEY[step.id]) as string,
                }))}
              />
            )}

            <div className="absolute right-3 top-3 flex items-center gap-2">
              <ToggleGroup
                className="flex w-fit shrink-0 items-center gap-1 border-neutral-100 bg-neutral-100"
                optionClassName="size-8 p-0 flex items-center justify-center"
                indicatorClassName="border border-neutral-200 bg-white"
                options={[
                  {
                    label: <ChartLine className="size-4 text-neutral-600" />,
                    value: "timeseries",
                  },
                  {
                    label: (
                      <Filter2 className="size-4 -rotate-90 text-neutral-600" />
                    ),
                    value: "funnel",
                  },
                ]}
                selected={view}
                selectAction={(next) =>
                  queryParams({
                    set: { view: next },
                    scroll: false,
                  })
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
