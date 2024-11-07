"use client";

import { INTERVAL_DATA, INTERVAL_DISPLAYS } from "@/lib/analytics/constants";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import usePartnerEvents from "@/lib/swr/use-partner-events";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import Areas from "@/ui/charts/areas";
import { ChartContext } from "@/ui/charts/chart-context";
import TimeSeriesChart from "@/ui/charts/time-series-chart";
import XAxis from "@/ui/charts/x-axis";
import YAxis from "@/ui/charts/y-axis";
import EmptyState from "@/ui/shared/empty-state";
import { MiniAreaChart } from "@dub/blocks";
import {
  Button,
  Check2,
  DateRangePicker,
  MaxWidthWrapper,
  Table,
  useCopyToClipboard,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  CircleDollar,
  Copy,
  LoadingSpinner,
  MoneyBill2,
} from "@dub/ui/src/icons";
import {
  cn,
  currencyFormatter,
  formatDate,
  getPrettyUrl,
  nFormatter,
  pluralize,
} from "@dub/utils";
import { LinearGradient } from "@visx/gradient";
import { endOfDay, startOfDay, subDays } from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createContext, useContext, useId, useMemo } from "react";
import { HeroBackground } from "./hero-background";

const ProgramOverviewContext = createContext<{
  start?: Date;
  end?: Date;
  interval?: string;
  color?: string;
}>({});

export default function ProgramPageClient() {
  const { searchParams } = useRouterStuff();

  const { programEnrollment } = useProgramEnrollment();
  const [copied, copyToClipboard] = useCopyToClipboard();

  const { start, end } = useMemo(() => {
    const hasRange = searchParams?.has("start") && searchParams?.has("end");

    return {
      start: hasRange
        ? startOfDay(
            new Date(searchParams?.get("start") || subDays(new Date(), 1)),
          )
        : undefined,

      end: hasRange
        ? endOfDay(new Date(searchParams?.get("end") || new Date()))
        : undefined,
    };
  }, [searchParams?.get("start"), searchParams?.get("end")]);

  const interval =
    start || end ? undefined : searchParams?.get("interval") ?? "30d";

  const program = programEnrollment?.program;
  const color =
    program?.id === "prog_MqN7G1vSbuSELpYJwioHyDE8" ? "#8B5CF6" : undefined;

  return (
    <MaxWidthWrapper className="pb-10">
      <div className="relative flex flex-col rounded-lg border border-neutral-300 bg-gradient-to-r from-neutral-50 p-4 md:p-6">
        {program && <HeroBackground logo={program?.logo} color={color} />}
        <span className="flex items-center gap-2 text-sm text-neutral-500">
          <MoneyBill2 className="size-4" />
          Refer and earn
        </span>
        <div className="relative mt-24 text-lg text-neutral-900 sm:max-w-[50%]">
          {program ? (
            <>
              Earn{" "}
              <strong className="font-semibold">
                {program.commissionType === "percentage"
                  ? program.commissionAmount + "%"
                  : currencyFormatter(program.commissionAmount / 100, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
              </strong>
              for each conversion
              {program.recurringCommission &&
              ((program.recurringDuration && program.recurringDuration > 0) ||
                program.isLifetimeRecurring) ? (
                <>
                  , and again{" "}
                  <strong className="font-semibold">
                    every {program.recurringInterval || "cycle"} for{" "}
                    {program.isLifetimeRecurring
                      ? "the customer's lifetime."
                      : program.recurringDuration
                        ? `${program.recurringDuration} ${pluralize(program.recurringInterval || "cycle", program.recurringDuration)}.`
                        : null}
                  </strong>
                </>
              ) : (
                "."
              )}
            </>
          ) : (
            <div className="mb-7 h-7 w-full animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
        <span className="mb-1.5 mt-6 block text-sm text-neutral-800">
          Referral link
        </span>
        <div className="xs:flex-row relative flex flex-col items-center gap-2">
          {programEnrollment?.link ? (
            <input
              type="text"
              readOnly
              value={getPrettyUrl(programEnrollment?.link.shortLink)}
              className="xs:w-auto h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 lg:min-w-64 xl:min-w-72"
            />
          ) : (
            <div className="h-10 w-16 animate-pulse rounded-md bg-neutral-200 lg:w-72" />
          )}
          <Button
            icon={
              copied ? (
                <Check2 className="size-4" />
              ) : (
                <Copy className="size-4" />
              )
            }
            text={copied ? "Copied link" : "Copy link"}
            className="xs:w-fit"
            onClick={() =>
              copyToClipboard(getPrettyUrl(programEnrollment?.link?.shortLink))
            }
          />
        </div>
      </div>
      <ProgramOverviewContext.Provider value={{ start, end, interval, color }}>
        <div className="mt-6 rounded-lg border border-neutral-300">
          <div className="p-4 md:p-6 md:pb-4">
            <EarningsChart />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
          <StatCard title="Clicks" event="clicks" />
          <StatCard title="Leads" event="leads" />
          <StatCard title="Conversions" event="sales" />
        </div>
        <div className="mt-6">
          <h2 className="text-base font-medium text-neutral-900">
            {!start && !end ? "Recent conversions" : "Conversions"}
          </h2>
          <div className="mt-4">
            <SalesTable />
          </div>
        </div>
      </ProgramOverviewContext.Provider>
    </MaxWidthWrapper>
  );
}

function EarningsChart() {
  const { queryParams } = useRouterStuff();
  const id = useId();

  const { start, end, interval, color } = useContext(ProgramOverviewContext);

  const { data: { earnings: total } = {} } = usePartnerAnalytics({
    interval: interval as any,
    start,
    end,
  });
  const { data: timeseries, error } = usePartnerAnalytics({
    groupBy: "timeseries",
    interval: interval as any,
    start,
    end,
  });

  const data = useMemo(
    () =>
      timeseries?.map(({ start, earnings }) => ({
        date: new Date(start),
        values: { earnings: earnings / 100 },
      })),
    [timeseries],
  );

  return (
    <div>
      <div className="flex flex-col-reverse items-start justify-between gap-4 md:flex-row">
        <div>
          <span className="block text-sm text-neutral-500">Earnings</span>
          <div className="mt-1.5">
            {total !== undefined ? (
              <span className="text-2xl leading-none text-neutral-800">
                {currencyFormatter(total / 100, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            ) : (
              <div className="h-7 w-24 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
        <div className="w-full md:w-auto">
          <DateRangePicker
            className="h-8 w-full md:w-fit"
            align="end"
            value={
              start && end
                ? {
                    from: start,
                    to: end,
                  }
                : undefined
            }
            presetId={!start || !end ? interval ?? "24h" : undefined}
            onChange={(range, preset) => {
              if (preset) {
                queryParams({
                  del: ["start", "end"],
                  set: {
                    interval: preset.id,
                  },
                  scroll: false,
                });

                return;
              }

              // Regular range
              if (!range || !range.from || !range.to) return;

              queryParams({
                del: "interval",
                set: {
                  start: range.from.toISOString(),
                  end: range.to.toISOString(),
                },
                scroll: false,
              });
            }}
            presets={INTERVAL_DISPLAYS.map(({ display, value, shortcut }) => {
              const start = INTERVAL_DATA[value].startDate;
              const end = new Date();

              return {
                id: value,
                label: display,
                dateRange: {
                  from: start,
                  to: end,
                },
                shortcut,
              };
            })}
          />
        </div>
      </div>
      <div className="relative mt-4 h-64 w-full">
        {data ? (
          <TimeSeriesChart
            data={data}
            series={[
              {
                id: "earnings",
                valueAccessor: (d) => d.values.earnings,
                colorClassName: color ? `text-[${color}]` : "text-violet-500",
                isActive: true,
              },
            ]}
            tooltipClassName="p-0"
            tooltipContent={(d) => {
              return (
                <>
                  <p className="border-b border-gray-200 px-4 py-3 text-sm text-gray-900">
                    {formatDate(d.date)}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-sm shadow-[inset_0_0_0_1px_#0003]",
                          color ? `bg-[${color}]` : "bg-violet-500",
                        )}
                      />
                      <p className="capitalize text-gray-600">Earnings</p>
                    </div>
                    <p className="text-right font-medium text-gray-900">
                      {currencyFormatter(d.values.earnings, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </>
              );
            }}
          >
            <ChartContext.Consumer>
              {(context) => (
                <LinearGradient
                  id={`${id}-color-gradient`}
                  from={color || "#7D3AEC"}
                  to={color || "#DA2778"}
                  x1={0}
                  x2={context?.width ?? 1}
                  gradientUnits="userSpaceOnUse"
                />
              )}
            </ChartContext.Consumer>

            <XAxis />
            <YAxis showGridLines />
            <Areas
              seriesStyles={[
                {
                  id: "earnings",
                  areaFill: `url(#${id}-color-gradient)`,
                  lineStroke: `url(#${id}-color-gradient)`,
                  lineClassName: `text-[${color}]`,
                },
              ]}
            />
          </TimeSeriesChart>
        ) : (
          <div className="flex size-full items-center justify-center">
            {error ? (
              <span className="text-sm text-neutral-500">
                Failed to load earnings data.
              </span>
            ) : (
              <LoadingSpinner />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  event,
}: {
  title: string;
  event: "clicks" | "leads" | "sales";
}) {
  const { partnerId, programId } = useParams();
  const { start, end, interval, color } = useContext(ProgramOverviewContext);

  const { data: total } = usePartnerAnalytics({
    interval: interval as any,
    start,
    end,
  });
  const { data: timeseries, error } = usePartnerAnalytics({
    groupBy: "timeseries",
    interval: interval as any,
    start,
    end,
    event,
  });

  return (
    <Link
      href={`/${partnerId}/${programId}/events?event=${event}`}
      className="hover:drop-shadow-card-hover block rounded-md border border-neutral-300 bg-white p-5 transition-[filter]"
    >
      <span className="block text-sm text-neutral-500">{title}</span>
      {total !== undefined ? (
        <span className="block text-2xl text-neutral-800">
          {nFormatter(total[event])}
        </span>
      ) : (
        <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-200" />
      )}
      <div className="mt-2 h-16 w-full">
        {timeseries ? (
          <MiniAreaChart
            data={timeseries.map((d) => ({
              date: new Date(d.start),
              value: d[event],
            }))}
            curve={false}
            color={color}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            {error ? (
              <span className="text-sm text-neutral-500">
                Failed to load data.
              </span>
            ) : (
              <LoadingSpinner />
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function SalesTable() {
  const { start, end, interval } = useContext(ProgramOverviewContext);

  const { data: { sales: totalSaleEvents } = {} } = usePartnerAnalytics({
    interval: interval as any,
    start,
    end,
  });
  const {
    data: saleEvents,
    loading,
    error,
  } = usePartnerEvents({
    event: "sales",
    interval: interval as any,
    start,
    end,
  });

  const { pagination, setPagination } = usePagination();

  const { table, ...tableProps } = useTable({
    data: saleEvents ?? [],
    loading,
    error: error ? "Failed to fetch sales events." : undefined,
    columns: [
      {
        id: "timestamp",
        header: "Date",
        accessorKey: "timestamp",
        cell: ({ row }) => {
          return formatDate(row.original.timestamp, { month: "short" });
        },
      },
      {
        id: "customer",
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row }) => {
          return row.original.customer.email;
        },
      },
      {
        id: "earned",
        header: "Earned",
        accessorKey: "earnings",
        cell: ({ row }) => {
          return currencyFormatter(row.original.earnings / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    rowCount: totalSaleEvents,
    emptyState: (
      <EmptyState
        icon={CircleDollar}
        title="No sales recorded"
        description={`Referral sales will appear here.`}
      />
    ),
    resourceName: (plural) => `sale${plural ? "s" : ""}`,
  });

  return (
    <Table
      {...tableProps}
      table={table}
      containerClassName="border-neutral-300"
    />
  );
}
