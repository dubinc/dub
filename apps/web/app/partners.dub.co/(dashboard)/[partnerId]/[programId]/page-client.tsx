"use client";

import Areas from "@/ui/charts/areas";
import TimeSeriesChart from "@/ui/charts/time-series-chart";
import XAxis from "@/ui/charts/x-axis";
import YAxis from "@/ui/charts/y-axis";
import EmptyState from "@/ui/shared/empty-state";
import { MiniAreaChart } from "@dub/blocks";
import {
  Button,
  MaxWidthWrapper,
  Table,
  usePagination,
  useTable,
} from "@dub/ui";
import { CircleDollar, Copy, LoadingSpinner } from "@dub/ui/src/icons";
import { currencyFormatter, formatDate, nFormatter } from "@dub/utils";
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
  const referralLink = "framer.link/steven"; // TODO: get from API

  // TODO: get all of these values from API

  const { total: earnings, timeseries: earningsTimeseries } = useMemo(
    () => mockValues(100),
    [],
  );
  const earningsError = false;

  const { total: clicks, timeseries: clicksTimeseries } = useMemo(
    () => mockValues(3),
    [],
  );
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
          {referralLink !== undefined ? (
            <input
              type="text"
              readOnly
              value={referralLink}
              className="h-10 rounded-md border border-neutral-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 lg:min-w-72"
            />
          ) : (
            <div className="h-10 w-16 animate-pulse rounded-md bg-neutral-200 lg:w-72" />
          )}
          <Button
            icon={<Copy className="size-4" />}
            text="Copy link"
            className="w-fit"
          />
        </div>
      </div>
      <div className="mt-6 rounded-lg border border-neutral-300">
        <div className="p-4 md:p-8 md:pb-4">
          <EarningsChart
            amount={earnings}
            timeseries={earningsTimeseries}
            error={Boolean(earningsError)}
          />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
        <StatCard
          title="Clicks"
          value={clicks}
          timeseries={clicksTimeseries}
          error={Boolean(statsError)}
        />
        <StatCard
          title="Leads"
          value={leads}
          timeseries={leadsTimeseries}
          error={Boolean(statsError)}
        />
        <StatCard
          title="Sales"
          value={sales}
          timeseries={salesTimeseries}
          error={Boolean(statsError)}
        />
      </div>
      <div className="mt-6">
        <SalesTable />
      </div>
    </MaxWidthWrapper>
  );
}

function EarningsChart({
  amount,
  timeseries,
  error,
}: {
  amount?: number;
  timeseries?: { date: Date; value: number }[];
  error?: boolean;
}) {
  const id = useId();
  const data = useMemo(
    () => timeseries?.map(({ date, value }) => ({ date, values: { value } })),
    [timeseries],
  );

  return (
    <div>
      <span className="block text-sm text-neutral-500">Earnings</span>
      <div className="mt-2">
        {amount !== undefined ? (
          <span className="text-3xl text-neutral-800">
            {currencyFormatter(amount / 100)}
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
                id: "value",
                valueAccessor: (d) => d.values.value / 100,
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
                      {currencyFormatter(d.values.value / 100)}
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
  value,
  timeseries,
  error,
}: {
  title: string;
  value?: number;
  timeseries?: { date: Date; value: number }[];
  error?: boolean;
}) {
  return (
    <div className="rounded-md border border-neutral-300 p-5">
      <span className="block text-sm text-neutral-500">{title}</span>
      {value !== undefined ? (
        <span className="block text-2xl text-neutral-800">
          {nFormatter(value)}
        </span>
      ) : (
        <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-200" />
      )}
      <div className="mt-2 h-16 w-full">
        {timeseries ? (
          <MiniAreaChart data={timeseries} curve={false} />
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
  // TODO: get from API
  const salesEvents = useMemo(() => mockSales(), []);
  const totalSalesEvents = salesEvents.length;
  const loading = false;
  const error = false;

  const { pagination, setPagination } = usePagination();

  const { table, ...tableProps } = useTable({
    data: salesEvents,
    loading,
    error: error ? "Failed to fetch sales events." : undefined,
    columns: [
      {
        id: "date",
        header: "Date",
        accessorKey: "date",
        cell: ({ row }) => {
          return formatDate(row.original.date, { month: "short" });
        },
      },
      {
        id: "customer",
        header: "Customer",
        accessorKey: "customer",
      },
      {
        id: "earned",
        header: "Earned",
        accessorKey: "earnings",
        cell: ({ row }) => {
          return currencyFormatter(row.original.earnings, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    rowCount: totalSalesEvents,
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
