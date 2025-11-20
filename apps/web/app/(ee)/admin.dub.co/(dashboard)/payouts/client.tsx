"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { AnalyticsLoadingSpinner } from "@/ui/analytics/analytics-loading-spinner";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { InvoiceStatus } from "@dub/prisma/client";
import {
  Filter,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { CircleDotted, GridIcon } from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  fetcher,
  formatDateTime,
  OG_AVATAR_URL,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Fragment, useCallback, useMemo, useState } from "react";
import useSWR from "swr";

interface TimeseriesData {
  date: Date;
  payouts: number;
  fees: number;
  total: number;
}

interface InvoiceData {
  date: Date;
  programId: string;
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
  const { interval, start, end, status, programId } = searchParamsObj;

  const { data: { invoices, timeseriesData } = {}, isLoading } = useSWR<{
    invoices: InvoiceData[];
    timeseriesData: TimeseriesData[];
  }>(`/api/admin/payouts${getQueryString()}`, fetcher, {
    keepPreviousData: true,
  });

  // Extract unique programs from invoices
  const programs = useMemo(() => {
    if (!invoices) return [];
    const programMap = new Map<
      string,
      { id: string; name: string; logo: string }
    >();
    invoices.forEach((invoice) => {
      if (!programMap.has(invoice.programId)) {
        programMap.set(invoice.programId, {
          id: invoice.programId,
          name: invoice.programName,
          logo: invoice.programLogo,
        });
      }
    });
    return Array.from(programMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [invoices]);

  // Filter configuration
  const filters = useMemo(
    () => [
      {
        key: "programId",
        icon: GridIcon,
        label: "Program",
        options:
          programs.map((program) => ({
            value: program.id,
            label: program.name,
            icon: (
              <img
                src={program.logo || `${OG_AVATAR_URL}${program.name}`}
                alt={`${program.name} image`}
                className="size-4 rounded-full"
              />
            ),
          })) ?? null,
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(PayoutStatusBadges)
          .filter(([key]) =>
            ["processing", "completed", "failed"].includes(key),
          )
          .map(([value, { label }]) => {
            const Icon =
              PayoutStatusBadges[value as keyof typeof PayoutStatusBadges].icon;
            return {
              value,
              label,
              icon: (
                <Icon
                  className={cn(
                    PayoutStatusBadges[value as keyof typeof PayoutStatusBadges]
                      .className,
                    "size-4 bg-transparent",
                  )}
                />
              ),
            };
          }),
      },
    ],
    [programs],
  );

  const activeFilters = useMemo(() => {
    return [
      ...(programId ? [{ key: "programId", value: programId }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
    ];
  }, [programId, status]);

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) =>
      queryParams({
        del: [key, "page"],
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["status", "programId"],
      }),
    [queryParams],
  );

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
        meta: {
          filterParams: ({ row }) => ({
            programId: row.original.programId,
          }),
        },
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
        meta: {
          filterParams: ({ row }) => ({
            status: row.original.status,
          }),
        },
      },
      {
        id: "amount",
        header: "Amount",
        accessorKey: "amount",
        cell: ({ row }) => currencyFormatter(row.original.amount),
      },
      {
        id: "fee",
        header: "Fee",
        accessorKey: "fee",
        cell: ({ row }) => currencyFormatter(row.original.fee),
      },
      {
        id: "total",
        header: "Total",
        accessorKey: "total",
        cell: ({ row }) => currencyFormatter(row.original.total),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    resourceName: (plural) => `invoice${plural ? "s" : ""}`,
    rowCount: invoices?.length ?? 0,
    loading: isLoading,
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as
        | {
            filterParams?: any;
          }
        | undefined;

      return (
        meta?.filterParams && (
          <FilterButtonTableRow set={meta.filterParams(cell)} />
        )
      );
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Filter.Select
          className="w-full md:w-fit"
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
          onSearchChange={setSearch}
          onSelectedFilterChange={setSelectedFilter}
        />
        <SimpleDateRangePicker
          defaultInterval="mtd"
          className="w-full sm:min-w-[200px] md:w-fit"
        />
      </div>
      {activeFilters.length > 0 && (
        <div>
          <Filter.List
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
            onRemoveAll={onRemoveAll}
          />
        </div>
      )}
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
                            {currencyFormatter(d.values.value)}
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

      <div className="w-full">
        <Table {...tableProps} table={table} />
      </div>
    </div>
  );
}
