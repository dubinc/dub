"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { AnalyticsLoadingSpinner } from "@/ui/analytics/analytics-loading-spinner";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { InvoiceStatus } from "@dub/prisma/client";
import {
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { cn, currencyFormatter, fetcher, formatDateTime } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Fragment, useMemo, useState } from "react";
import useSWR from "swr";

interface TimeseriesData {
  date: Date;
  payouts: number;
  fees: number;
  total: number;
}

interface InvoiceData {
  date: Date;
  programName: string;
  programLogo: string;
  status: InvoiceStatus;
  amount: number;
  fee: number;
  total: number;
}

type Tab = {
  id: "payouts" | "fees" | "total";
  label: string;
  colorClassName: string;
};

export default function PayoutsPageClient() {
  const { queryParams, getQueryString, searchParamsObj } = useRouterStuff();
  const { interval, start, end } = searchParamsObj;

  const { data: { invoices, timeseriesData } = {}, isLoading } = useSWR<{
    invoices: InvoiceData[];
    timeseriesData: TimeseriesData[];
  }>(`/api/admin/payouts${getQueryString()}`, fetcher, {
    keepPreviousData: true,
  });

  const tabs: Tab[] = [
    {
      id: "payouts",
      label: "Payouts",
      colorClassName: "text-blue-500/50 bg-blue-500/50 border-blue-500",
    },
    {
      id: "fees",
      label: "Fees",
      colorClassName: "text-red-500/50 bg-red-500/50 border-red-500",
    },
    {
      id: "total",
      label: "Total",
      colorClassName: "text-green-500/50 bg-green-500/50 border-green-500",
    },
  ];

  const [selectedTab, setSelectedTab] = useState<"payouts" | "fees" | "total">(
    "payouts",
  );
  const tab = tabs.find(({ id }) => id === selectedTab) ?? tabs[0];

  // take the last 12 months
  const chartData =
    timeseriesData?.map(({ date, ...rest }) => ({
      date: new Date(date),
      values: {
        value: rest[selectedTab],
      },
    })) ?? null;

  const dateFormatter = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  const totals = useMemo(() => {
    return {
      payouts:
        timeseriesData?.reduce((acc, { payouts }) => acc + payouts, 0) ?? 0,
      fees: timeseriesData?.reduce((acc, { fees }) => acc + fees, 0) ?? 0,
      total: timeseriesData?.reduce((acc, { total }) => acc + total, 0) ?? 0,
    };
  }, [timeseriesData]);

  const { pagination, setPagination } = usePagination();

  const { table, ...tableProps } = useTable({
    data: invoices ?? [],
    columns: [
      {
        id: "date",
        header: "Payment Date (UTC)",
        accessorKey: "date",
        cell: ({ row }) =>
          formatDateTime(row.original.date, {
            timeZone: "UTC",
          }),
      },
      {
        id: "program",
        header: "Program",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <img
              src={row.original.programLogo}
              alt={row.original.programName}
              width={20}
              height={20}
              className="size-4 rounded-full"
            />
            <span className="text-sm font-medium">
              {row.original.programName}
            </span>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const badge = PayoutStatusBadges[row.original.status];

          return badge ? (
            <StatusBadge icon={badge.icon} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          ) : (
            "-"
          );
        },
      },
      {
        id: "amount",
        header: "Amount",
        accessorKey: "amount",
        cell: ({ row }) =>
          currencyFormatter(row.original.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        id: "fee",
        header: "Fee",
        accessorKey: "fee",
        cell: ({ row }) =>
          currencyFormatter(row.original.fee / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        id: "total",
        header: "Total",
        accessorKey: "total",
        cell: ({ row }) =>
          currencyFormatter(row.original.total / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    resourceName: (plural) => `invoice${plural ? "s" : ""}`,
    rowCount: invoices?.length ?? 0,
    loading: isLoading,
  });

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col space-y-6 p-6">
      <SimpleDateRangePicker defaultInterval="mtd" className="w-fit" />
      <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        <div className="scrollbar-hide grid w-full grid-cols-3 divide-x overflow-y-hidden">
          {tabs.map(({ id, label, colorClassName }) => {
            return (
              <button
                key={id}
                onClick={() => {
                  setSelectedTab(id);
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
                      id: "value",
                      valueAccessor: (d) => d.values.value,
                      isActive: true,
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
                          timezone: "UTC",
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
                            {currencyFormatter(d.values.value / 100)}
                          </p>
                        </Fragment>
                      </div>
                    </>
                  )}
                >
                  <Areas />
                  <XAxis maxTicks={5} tickFormat={dateFormatter} />
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
