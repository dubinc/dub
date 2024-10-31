"use client";

import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import usePartnerEvents from "@/lib/swr/use-partner-events";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import Areas from "@/ui/charts/areas";
import TimeSeriesChart from "@/ui/charts/time-series-chart";
import XAxis from "@/ui/charts/x-axis";
import YAxis from "@/ui/charts/y-axis";
import EmptyState from "@/ui/shared/empty-state";
import { MiniAreaChart } from "@dub/blocks";
import {
  Button,
  Check2,
  MaxWidthWrapper,
  Table,
  useCopyToClipboard,
  usePagination,
  useTable,
} from "@dub/ui";
import { CircleDollar, Copy, LoadingSpinner } from "@dub/ui/src/icons";
import {
  currencyFormatter,
  formatDate,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import { LinearGradient } from "@visx/gradient";
import { subDays } from "date-fns";
import { useId, useMemo } from "react";

const mockValues = (factor = 1) => {
  const timeseries = [...Array(30)].map((_, i) => ({
    date: subDays(new Date(), 30 - i),
    value: Math.floor(Math.random() * 100 * factor),
  }));

  return {
    total: timeseries.reduce((acc, curr) => acc + curr.value, 0),
    timeseries,
    isError: false,
  };
};

const mockSales = () =>
  [...Array(10)].map((_, i) => ({
    date: subDays(new Date(), 10 - i),
    earnings: Math.floor(Math.random() * 15),
    customer: `*****@${["dub.co", "gmail.com"][i % 2]}`,
  }));

export default function ProgramPageClient() {
  const { programEnrollment } = useProgramEnrollment();
  const [copied, copyToClipboard] = useCopyToClipboard();

  const { total: leads, timeseries: leadsTimeseries } = useMemo(
    () => mockValues(1),
    [],
  );
  const { total: sales, timeseries: salesTimeseries } = useMemo(
    () => mockValues(0.25),
    [],
  );
  const statsError = false;

  return (
    <MaxWidthWrapper className="pb-10">
      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-neutral-300 bg-neutral-50 p-4 sm:flex-row sm:items-center md:p-8">
        <div>
          <span className="block text-xl font-medium leading-none text-neutral-900">
            Referral link
          </span>
          <p className="mt-2 text-sm text-neutral-500">
            Track events and conversions when using your referral link
          </p>
        </div>
        <div className="flex items-center gap-2">
          {programEnrollment?.link ? (
            <input
              type="text"
              readOnly
              value={getPrettyUrl(programEnrollment?.link.shortLink)}
              className="h-10 rounded-md border border-neutral-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 lg:min-w-72"
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
            className="w-fit"
            onClick={() =>
              copyToClipboard(getPrettyUrl(programEnrollment?.link?.shortLink))
            }
          />
        </div>
      </div>
      <div className="mt-6 rounded-lg border border-neutral-300">
        <div className="p-4 md:p-8 md:pb-4">
          <EarningsChart />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
        <StatCard title="Clicks" event="clicks" />
        <StatCard title="Leads" event="leads" />
        <StatCard title="Sales" event="sales" />
      </div>
      <div className="mt-6">
        <SalesTable />
      </div>
    </MaxWidthWrapper>
  );
}

function EarningsChart() {
  const id = useId();

  const { data: { earnings: total } = {} } = usePartnerAnalytics();
  const { data: timeseries, error } = usePartnerAnalytics({
    groupBy: "timeseries",
    interval: "90d",
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
      <span className="block text-sm text-neutral-500">Earnings</span>
      <div className="mt-2">
        {total !== undefined ? (
          <span className="text-3xl text-neutral-800">
            {currencyFormatter(total / 100)}
          </span>
        ) : (
          <div className="h-9 w-24 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
      <div className="relative h-64 w-full">
        {data ? (
          <TimeSeriesChart
            data={data}
            series={[
              {
                id: "earnings",
                valueAccessor: (d) => d.values.earnings,
                colorClassName: "text-[#DA2778]",
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
                      <div className="h-2 w-2 rounded-sm bg-violet-500 shadow-[inset_0_0_0_1px_#0003]" />
                      <p className="capitalize text-gray-600">Earnings</p>
                    </div>
                    <p className="text-right font-medium text-gray-900">
                      {currencyFormatter(d.values.earnings)}
                    </p>
                  </div>
                </>
              );
            }}
          >
            <LinearGradient
              id={`${id}-color-gradient`}
              from="#7D3AEC"
              to="#DA2778"
              x1={0}
              x2={1}
            />

            <XAxis />
            <YAxis showGridLines />
            <Areas
              seriesStyles={[
                {
                  id: "value",
                  areaFill: `url(#${id}-color-gradient)`,
                  lineStroke: `url(#${id}-color-gradient)`,
                  lineClassName: "text-[#DA2778]",
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
  const { data: total } = usePartnerAnalytics();
  const { data: timeseries, error } = usePartnerAnalytics({
    groupBy: "timeseries",
    interval: "90d",
    event,
  });

  return (
    <div className="rounded-md border border-neutral-300 p-5">
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
    </div>
  );
}

function SalesTable() {
  const { data: { sales: totalSaleEvents } = {} } = usePartnerAnalytics();
  const {
    data: saleEvents,
    loading,
    error,
  } = usePartnerEvents({
    event: "sales",
    interval: "90d",
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