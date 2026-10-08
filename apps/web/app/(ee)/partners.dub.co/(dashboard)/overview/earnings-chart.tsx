"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { testIds } from "@/lib/e2e/test-ids";
import { usePartnerProfileEarningsTimeseries } from "@/lib/swr/use-partner-profile-earnings";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import {
  Areas,
  ChartContext,
  TimeSeriesChart,
  XAxis,
  YAxis,
} from "@dub/ui/charts";
import { LoadingSpinner } from "@dub/ui/icons";
import { currencyFormatter, nFormatter } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { LinearGradient } from "@visx/gradient";
import { useRouter } from "next/navigation";
import { useId, useMemo } from "react";
import { ProgramLogo } from "./overview-card";
import { useOverviewDateRange } from "./use-overview-date-range";
import { useTopProgramEarnings } from "./use-top-program-earnings";

const MAX_TOOLTIP_PROGRAMS = 5;

export function EarningsChart() {
  const id = useId();
  const router = useRouter();
  const { start, end, interval } = useOverviewDateRange();

  const { data: timeseries, error } = usePartnerProfileEarningsTimeseries({
    groupBy: "programId",
    interval,
    start,
    end,
  });

  const { programEnrollments } = useProgramEnrollments();
  const { data: topPrograms } = useTopProgramEarnings();

  // the enrollments list skips deactivated programs, but their earnings are still in the chart
  const programs = useMemo(
    () =>
      new Map<string, { name: string; logo: string | null }>([
        ...(programEnrollments?.map(
          ({ program }) => [program.id, program] as const,
        ) ?? []),
        ...(topPrograms?.map((program) => [program.id, program] as const) ??
          []),
      ]),
    [programEnrollments, topPrograms],
  );

  const total = useMemo(
    () => timeseries?.reduce((acc, { earnings }) => acc + earnings, 0),
    [timeseries],
  );

  const data = useMemo(
    () =>
      timeseries?.map(({ start, earnings, data }) => ({
        date: new Date(start),
        values: { main: earnings, programs: data ?? {} },
      })),
    [timeseries],
  );

  return (
    <div
      data-testid={testIds.partnerOverview.earnings}
      className="flex flex-col rounded-xl border border-neutral-200 bg-white lg:h-[460px]"
    >
      <div className="px-5 py-4">
        <h2 className="pt-0.5 text-base font-semibold leading-6 text-neutral-800">
          Earnings
        </h2>
        {total !== undefined ? (
          <NumberFlow
            className="text-lg font-medium leading-7 text-neutral-600"
            value={total / 100}
            format={{
              style: "currency",
              currency: "USD",
              // @ts-ignore - trailingZeroDisplay is a valid option but TS is outdated
              trailingZeroDisplay: "stripIfInteger",
            }}
          />
        ) : (
          <div className="mt-0.5 h-7 w-24 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
      <div className="relative h-72 w-full px-5 pb-3 lg:h-auto lg:min-h-0 lg:flex-1">
        {error ? (
          <div className="flex size-full items-center justify-center">
            <span className="text-sm text-neutral-500">
              Failed to load earnings data.
            </span>
          </div>
        ) : !data ? (
          <div className="flex size-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : total === 0 ? (
          <div className="flex size-full items-center justify-center">
            <span className="text-sm text-neutral-500">
              No earnings in this date range
            </span>
          </div>
        ) : (
          <TimeSeriesChart
            data={data}
            series={[
              {
                id: "main",
                valueAccessor: (d) => d.values.main,
                colorClassName: "text-[#DA2778]",
                isActive: true,
              },
            ]}
            onXValueClick={() => router.push("/programs")}
            tooltipClassName="w-[240px] overflow-hidden p-0 shadow-md"
            tooltipContent={(d) => {
              const programEarnings = Object.entries(
                d.values.programs as Record<string, number>,
              )
                .filter(([, earnings]) => earnings !== 0)
                .sort(([, a], [, b]) => b - a)
                .slice(0, MAX_TOOLTIP_PROGRAMS);

              return (
                <div className="text-[11px] leading-[1.1]">
                  <div className="flex items-center justify-between gap-3 border-b border-neutral-200 p-3">
                    <span className="truncate font-semibold text-neutral-900">
                      {formatDateTooltip(d.date, { interval, start, end })}
                    </span>
                    <span className="shrink-0 whitespace-nowrap font-semibold text-neutral-900">
                      {currencyFormatter(d.values.main)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 p-3">
                    {programEarnings.length > 0 ? (
                      programEarnings.map(([programId, earnings]) => {
                        const program = programs.get(programId);

                        return (
                          <div
                            key={programId}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {program && (
                                <ProgramLogo
                                  program={program}
                                  className="size-3.5"
                                />
                              )}
                              <span className="truncate font-medium text-neutral-700">
                                {program?.name ?? programId}
                              </span>
                            </div>
                            <span className="shrink-0 text-neutral-500">
                              {currencyFormatter(earnings)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-neutral-500">No earnings</span>
                    )}
                  </div>
                </div>
              );
            }}
          >
            <ChartContext.Consumer>
              {(context) => (
                <LinearGradient
                  id={`${id}-color-gradient`}
                  from="#7D3AEC"
                  to="#DA2778"
                  x1={0}
                  x2={context?.width ?? 1}
                  gradientUnits="userSpaceOnUse"
                />
              )}
            </ChartContext.Consumer>
            <XAxis
              showAxisLine={false}
              tickFormat={(date) =>
                formatDateTooltip(date, { interval, start, end })
              }
            />
            <YAxis
              showGridLines
              tickFormat={(value) => `$${nFormatter(value / 100)}`}
            />
            <Areas
              seriesStyles={[
                {
                  id: "main",
                  areaFill: `url(#${id}-color-gradient)`,
                  lineStroke: `url(#${id}-color-gradient)`,
                  lineClassName: "text-[#DA2778]",
                },
              ]}
            />
          </TimeSeriesChart>
        )}
      </div>
    </div>
  );
}
