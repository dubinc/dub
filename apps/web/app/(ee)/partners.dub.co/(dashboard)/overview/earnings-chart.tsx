"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { usePartnerDateRange } from "@/lib/analytics/use-partner-date-range";
import { testIds } from "@/lib/e2e/test-ids";
import { usePartnerProfileEarningsTimeseries } from "@/lib/swr/use-partner-profile-earnings";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import {
  ShareChartButton,
  ShareEarningsModal,
} from "@/ui/partners/earnings/share-earnings-modal";
import { ProgramLogo } from "@/ui/partners/program-logo";
import { useIsTouchDevice } from "@dub/ui";
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
import { useId, useMemo, useState } from "react";
import { ViewAllButton } from "./overview-card";
import { useEarningsPageHref } from "./use-earnings-page-href";
import { useTopProgramEarnings } from "./use-top-program-earnings";

const MAX_TOOLTIP_PROGRAMS = 5;

export function EarningsChart() {
  const id = useId();
  const router = useRouter();
  const { start, end, interval } = usePartnerDateRange();
  const earningsPageHref = useEarningsPageHref();
  const [showShareModal, setShowShareModal] = useState(false);

  // on touch devices, the chart opens /programs at the end of each drag, which
  // stops partners from reading the tooltip
  const isTouchDevice = useIsTouchDevice();

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
      <ShareEarningsModal
        showModal={showShareModal}
        setShowModal={setShowShareModal}
        start={start}
        end={end}
        interval={interval}
      />
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 pt-0.5">
            <h2 className="text-base font-semibold leading-6 text-neutral-800">
              Earnings
            </h2>
            <ShareChartButton onClick={() => setShowShareModal(true)} />
          </div>
          <ViewAllButton href={earningsPageHref} />
        </div>
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
          <div className="h-7 w-24 animate-pulse rounded-md bg-neutral-200" />
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
            onXValueClick={
              isTouchDevice ? undefined : () => router.push("/programs")
            }
            tooltipClassName="w-[240px] overflow-hidden p-0 shadow-md"
            tooltipBounds="clamp"
            tooltipContent={(d) => {
              const programEarnings = Object.entries(
                d.values.programs as Record<string, number>,
              )
                .filter(([, earnings]) => earnings !== 0)
                .sort(([, a], [, b]) => b - a)
                .slice(0, MAX_TOOLTIP_PROGRAMS);

              // the programs past the limit, so that the rows add up to the total
              const otherEarnings =
                d.values.main -
                programEarnings.reduce(
                  (acc, [, earnings]) => acc + earnings,
                  0,
                );

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
                    {programEarnings.length > 0 && otherEarnings !== 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="size-3.5 shrink-0" />
                          <span className="truncate font-medium text-neutral-700">
                            Other
                          </span>
                        </div>
                        <span className="shrink-0 text-neutral-500">
                          {currencyFormatter(otherEarnings)}
                        </span>
                      </div>
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
