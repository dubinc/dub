"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { AnalyticsLoadingSpinner } from "@/ui/analytics/analytics-loading-spinner";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  CrownSmall,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import {
  cn,
  currencyFormatter,
  fetcher,
  THE_BEGINNING_OF_TIME,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Fragment, useMemo } from "react";
import useSWR from "swr";

type Tab = {
  id: string;
  label: string;
  colorClassName: string;
};

export default function CommissionsPageClient() {
  const { queryParams, getQueryString, searchParamsObj } = useRouterStuff();
  const { interval, start, end } = searchParamsObj;

  const { data: { programs, timeseries } = {}, isLoading } = useSWR<{
    programs: {
      id: string;
      name: string;
      logo: string;
      commissions: number;
    }[];
    timeseries: {
      start: Date;
      commissions: number;
    }[];
  }>(
    `/api/admin/commissions${getQueryString({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const tabs: Tab[] = [
    {
      id: "commissions",
      label: "Commissions",
      colorClassName: "text-teal-500 bg-teal-500/50 border-teal-500",
    },
  ];

  const tab = tabs[0];
  const selectedTab = tab.id;

  const chartData =
    timeseries?.map(({ start, commissions }) => ({
      date: start ? new Date(start) : new Date(),
      values: {
        commissions: commissions || 0,
      },
    })) ?? null;

  const totals = useMemo(() => {
    return {
      commissions:
        timeseries?.reduce(
          (acc, { commissions }) => acc + (commissions || 0),
          0,
        ) ?? 0,
    };
  }, [timeseries]);

  const { pagination, setPagination } = usePagination();

  const { table, ...tableProps } = useTable({
    data: programs ?? [],
    columns: [
      {
        id: "position",
        header: "Position",
        size: 12,
        minSize: 12,
        maxSize: 12,
        cell: ({ row }) => {
          return (
            <div className="flex w-28 items-center justify-start gap-2 tabular-nums">
              {row.index + 1}
              {row.index <= 2 && (
                <CrownSmall
                  className={cn("size-4", {
                    "text-amber-400": row.index === 0,
                    "text-neutral-400": row.index === 1,
                    "text-yellow-900": row.index === 2,
                  })}
                />
              )}
            </div>
          );
        },
      },
      {
        id: "program",
        header: "Program",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <img
              src={row.original.logo}
              alt={row.original.name}
              width={20}
              height={20}
              className="size-4 rounded-full"
            />
            <span className="text-sm font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        id: "commissions",
        header: "Commissions",
        accessorKey: "commissions",
        cell: ({ row }) =>
          currencyFormatter(row.original.commissions / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    resourceName: (plural) => `program${plural ? "s" : ""}`,
    rowCount: programs?.length ?? 0,
    loading: isLoading,
  });

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col space-y-6 p-6">
      <SimpleDateRangePicker defaultInterval="mtd" className="w-fit" />
      <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        <div className="scrollbar-hide grid w-full grid-cols-2 divide-x overflow-y-hidden sm:grid-cols-3">
          {tabs.map(({ id, label, colorClassName }) => {
            return (
              <button
                key={id}
                onClick={() => {
                  queryParams({
                    set: { tab: id },
                  });
                }}
                className={cn(
                  "border-box relative block h-full w-full flex-none px-4 py-3 sm:px-8 sm:py-6",
                  "transition-colors hover:bg-neutral-50 focus:outline-none active:bg-neutral-100",
                  "ring-inset ring-neutral-500 focus-visible:ring-1 sm:first:rounded-tl-xl",
                )}
              >
                {/* Active tab indicator */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 h-0.5 w-full bg-black transition-transform duration-100",
                    selectedTab !== id && "translate-y-[3px]",
                  )}
                />
                <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-sm bg-current shadow-[inset_0_0_0_1px_#00000019]",
                      colorClassName,
                    )}
                  />
                  <span>{label}</span>
                </div>
                <div className="mt-1 flex h-12 items-center">
                  {(totals[id] || totals[id] === 0) && !isLoading ? (
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
                  ) : (
                    <div className="h-10 w-24 animate-pulse rounded-md bg-neutral-200" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-5 sm:p-10">
          <div className="flex h-96 w-full items-center justify-center">
            {chartData ? (
              chartData.length > 0 ? (
                <TimeSeriesChart
                  data={chartData}
                  series={[
                    {
                      id: "commissions",
                      valueAccessor: (d) => d.values.commissions,
                      isActive: selectedTab === "commissions",
                      colorClassName: tab.colorClassName,
                    },
                  ]}
                  tooltipClassName="p-0"
                  tooltipContent={(d) => (
                    <>
                      <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                        {formatDateTooltip(d.date, {
                          interval,
                          start,
                          end,
                        })}
                      </p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                        <Fragment>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "h-2 w-2 rounded-sm shadow-[inset_0_0_0_1px_#0003]",
                                tab.colorClassName,
                              )}
                            />
                            <p className="capitalize text-neutral-600">
                              {tab.label}
                            </p>
                          </div>
                          <p className="text-right font-medium text-neutral-900">
                            {currencyFormatter(d.values[tab.id] / 100)}
                          </p>
                        </Fragment>
                      </div>
                    </>
                  )}
                >
                  <Areas />
                  <XAxis
                    maxTicks={5}
                    tickFormat={(d) =>
                      formatDateTooltip(d, {
                        interval,
                        start,
                        end,
                        dataAvailableFrom: THE_BEGINNING_OF_TIME,
                      })
                    }
                  />
                  <YAxis
                    showGridLines
                    tickFormat={(value) => currencyFormatter(value / 100)}
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
      <div className="w-full">
        <Table {...tableProps} table={table} />
      </div>
    </div>
  );
}
