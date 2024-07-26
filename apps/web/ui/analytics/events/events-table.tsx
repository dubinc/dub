"use client";

import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { clickEventEnrichedSchema } from "@/lib/zod/schemas/clicks";
import { leadEventEnrichedSchema } from "@/lib/zod/schemas/leads";
import { saleEventEnrichedSchema } from "@/lib/zod/schemas/sales";
import EmptyState from "@/ui/shared/empty-state";
import { LinkLogo, Table, Tooltip, useRouterStuff, useTable } from "@dub/ui";
import {
  CursorRays,
  FilterBars,
  Magnifier,
  Menu3,
  QRCode,
} from "@dub/ui/src/icons";
import {
  COUNTRIES,
  capitalize,
  fetcher,
  getApexDomain,
  nFormatter,
} from "@dub/utils";
import { Cell, ColumnDef, VisibilityState } from "@tanstack/react-table";
import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import z from "zod";
import { AnalyticsContext } from "../analytics-provider";
import DeviceIcon from "../device-icon";
import EditColumnsButton from "./edit-columns-button";
import ExportButton from "./export-button";
import usePagination from "./use-pagination";

type EventType = "clicks" | "leads" | "sales";

type Datum =
  | z.infer<typeof clickEventEnrichedSchema>
  | z.infer<typeof leadEventEnrichedSchema>
  | z.infer<typeof saleEventEnrichedSchema>;

type ColumnMeta = {
  filterParams?: (
    args: Pick<Cell<Datum, any>, "getValue">,
  ) => Record<string, any>;
};

const eventColumns: Record<
  EventType,
  { all: string[]; defaultVisible: string[] }
> = {
  clicks: {
    all: [
      "trigger",
      "link",
      "country",
      "city",
      "device",
      "browser",
      "os",
      "timestamp",
    ],
    defaultVisible: ["trigger", "link", "country", "device", "timestamp"],
  },
  leads: {
    all: [
      "event",
      "link",
      "customer",
      "country",
      "city",
      "device",
      "browser",
      "os",
      "timestamp",
    ],
    defaultVisible: [
      "event",
      "link",
      "customer",
      "country",
      "device",
      "timestamp",
    ],
  },
  sales: {
    all: [
      "event",
      "customer",
      "invoiceId",
      "link",
      "country",
      "city",
      "device",
      "browser",
      "os",
      "timestamp",
      "amount",
    ],
    defaultVisible: [
      "event",
      "link",
      "customer",
      "country",
      "amount",
      "timestamp",
    ],
  },
};

const getDefaultColumnVisibility = (event: EventType) =>
  Object.fromEntries(
    eventColumns[event].all.map((id) => [
      id,
      eventColumns[event].defaultVisible.includes(id),
    ]),
  );

const FilterButton = ({ set }: { set: Record<string, any> }) => {
  const { queryParams } = useRouterStuff();

  return (
    <div className="relative h-[1.25rem] w-0 shrink-0 opacity-0 transition-all group-hover:w-[1.25rem] group-hover:opacity-100">
      <Link
        href={
          queryParams({
            set,
            del: "page",
            getNewPath: true,
          }) as string
        }
        className="absolute left-0 top-0 rounded-md border border-transparent bg-white p-0.5 text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-gray-950"
      >
        <span className="sr-only">Filter</span>
        <FilterBars className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
};

export default function EventsTable() {
  const { id: workspaceId } = useWorkspace();
  const { searchParams, queryParams } = useRouterStuff();
  const tab = searchParams.get("tab") || "clicks";

  const sortBy = searchParams.get("sort") || "timestamp";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const columns = useMemo<ColumnDef<Datum, any>[]>(
    () =>
      [
        // Click trigger
        {
          id: "trigger",
          header: "Event",
          accessorKey: "qr",
          enableHiding: false,
          size: 130,
          meta: {
            filterParams: ({ getValue }) => ({
              qr: !!getValue(),
            }),
          },
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3">
              {getValue() ? (
                <>
                  <QRCode className="h-4 w-4 shrink-0" />
                  <span className="truncate">QR scan</span>
                </>
              ) : (
                <>
                  <CursorRays className="h-4 w-4 shrink-0" />
                  <span className="truncate">Link click</span>
                </>
              )}
            </div>
          ),
        },
        // Lead/sale event name
        {
          id: "event",
          header: "Event",
          accessorKey: "event_name",
          enableHiding: false,
          size: 120,
          cell: ({ getValue }) =>
            getValue() || <span className="text-gray-400">-</span>,
        },
        // Sale invoice ID
        {
          id: "invoiceId",
          header: "Invoice ID",
          accessorKey: "invoice_id",
          size: 120,
          cell: ({ getValue }) =>
            getValue() || <span className="text-gray-400">-</span>,
        },
        {
          id: "link",
          header: "Link",
          accessorKey: "link",
          size: 200,
          meta: {
            filterParams: ({ getValue }) => ({
              domain: getValue().domain,
              key: getValue().key,
            }),
          },
          cell: ({ getValue }) => {
            const path = getValue().key === "_root" ? "" : `/${getValue().key}`;

            return (
              <div className="flex items-center gap-3">
                <LinkLogo
                  apexDomain={getApexDomain(getValue().url)}
                  className="h-4 w-4 sm:h-4 sm:w-4"
                />
                <span
                  className="truncate"
                  title={`${getValue().domain}${path}`}
                >
                  <span className="font-medium text-gray-950">
                    {getValue().domain}
                  </span>
                  {path}
                </span>
              </div>
            );
          },
        },
        {
          id: "customer",
          header: "Customer",
          accessorKey: "customer",
          cell: ({ getValue }) => {
            const display = getValue().name || getValue().email || "Unknown";
            return (
              <div className="flex items-center gap-3">
                <img
                  alt={display}
                  src={getValue().avatar}
                  className="h-4 w-4 shrink-0 rounded-full border border-gray-200"
                />
                <span className="truncate">{display}</span>
              </div>
            );
          },
        },
        {
          id: "country",
          header: "Country",
          accessorKey: "country",
          meta: {
            filterParams: ({ getValue }) => ({ country: getValue() }),
          },
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3">
              <img
                alt={getValue()}
                src={`https://hatscripts.github.io/circle-flags/flags/${getValue().toLowerCase()}.svg`}
                className="h-4 w-4 shrink-0"
              />
              <span className="truncate">
                {COUNTRIES[getValue()] ?? getValue()}
              </span>
            </div>
          ),
        },
        {
          id: "city",
          header: "City",
          accessorKey: "city",
          cell: ({ getValue, row }) => (
            <div className="flex items-center gap-3">
              <img
                alt={row.original.country}
                src={`https://hatscripts.github.io/circle-flags/flags/${row.original.country.toLowerCase()}.svg`}
                className="h-4 w-4 shrink-0"
              />
              <span className="truncate">{getValue()}</span>
            </div>
          ),
        },
        {
          id: "device",
          header: "Device",
          accessorKey: "device",
          meta: {
            filterParams: ({ getValue }) => ({ device: getValue() }),
          },
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3">
              <DeviceIcon
                display={capitalize(getValue()) ?? getValue()}
                tab="devices"
                className="h-4 w-4 shrink-0"
              />
              <span className="truncate">{getValue()}</span>
            </div>
          ),
        },
        {
          id: "browser",
          header: "Browser",
          accessorKey: "browser",
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3">
              <DeviceIcon
                display={capitalize(getValue()) ?? getValue()}
                tab="browsers"
                className="h-4 w-4 shrink-0 rounded-full"
              />
              <span className="truncate">{getValue()}</span>
            </div>
          ),
        },
        {
          id: "os",
          header: "OS",
          accessorKey: "os",
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3">
              <DeviceIcon
                display={capitalize(getValue()) ?? getValue()}
                tab="os"
                className="h-4 w-4 shrink-0"
              />
              <span className="truncate">{getValue()}</span>
            </div>
          ),
        },
        // Date
        {
          id: "timestamp",
          header: "Date",
          accessorFn: (d) => new Date(d.timestamp),
          enableHiding: false,
          minSize: 100,
          cell: ({ getValue }) => (
            <Tooltip
              content={getValue().toLocaleTimeString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
                hour12: true,
              })}
            >
              <div className="w-full truncate">
                {getValue().toLocaleTimeString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })}
              </div>
            </Tooltip>
          ),
        },
        // Sales amount
        {
          id: "amount",
          header: "Sales Amount",
          accessorKey: "amount",
          enableHiding: false,
          minSize: 120,
          cell: ({ getValue }) => (
            <div className="flex items-center gap-2">
              <span>${nFormatter(getValue() / 100)}</span>
              <span className="text-gray-400">USD</span>
            </div>
          ),
        },
      ].filter((c) => eventColumns[tab].all.includes(c.id)),
    [tab],
  );

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    getDefaultColumnVisibility(tab as EventType),
  );

  useEffect(() => {
    setColumnVisibility(getDefaultColumnVisibility(tab as EventType));
  }, [tab]);

  const defaultData = useMemo(() => [], []);

  const { pagination, setPagination } = usePagination();

  const { queryString: originalQueryString, totalEvents } =
    useContext(AnalyticsContext);

  const queryString = useMemo(
    () =>
      editQueryString(originalQueryString, {
        event: tab,
        page: pagination.pageIndex.toString(),
        sortBy,
        order,
      }).toString(),
    [originalQueryString, tab, pagination, sortBy, order],
  );

  const { data, isLoading, error } = useSWR<Datum[]>(
    `/api/analytics/events?${queryString}`,
    fetcher,
    {
      keepPreviousData: true,
      shouldRetryOnError: (err) => !err?.message?.includes("Need higher plan"),
    },
  );

  const needsHigherPlan = Boolean(error?.message?.includes("Need higher plan"));

  const { table, ...tableProps } = useTable({
    data: data ?? defaultData,
    loading: isLoading,
    error: error && !needsHigherPlan ? "Failed to fetch events." : undefined,
    columns,
    pagination,
    onPaginationChange: setPagination,
    rowCount: totalEvents?.[tab] ?? 0,
    columnVisibility,
    sortableColumns: ["timestamp", "amount"],
    sortBy: sortBy,
    sortOrder: order,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sort: sortBy }),
          ...(sortOrder && { order: sortOrder }),
        },
      }),
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as ColumnMeta | undefined;

      return (
        <>
          {meta?.filterParams && <FilterButton set={meta.filterParams(cell)} />}
        </>
      );
    },
    emptyState: needsHigherPlan ? (
      <EmptyState
        icon={Menu3}
        title="Real-time Events Stream"
        description={`Want more data on your ${tab === "clicks" ? "link clicks & QR code scans" : tab}? Upgrade to our Business Plan to get a detailed, real-time stream of events in your workspace.`}
        buttonText="Upgrade to Business"
        buttonLink={`/${workspaceId}/settings/billing?upgrade=business`}
      />
    ) : (
      <EmptyState
        icon={Magnifier}
        title="No events recorded"
        description="Events will appear here when your links are clicked."
      />
    ),
    resourceName: (plural) => `event${plural ? "s" : ""}`,
  });

  const exportQueryString = useMemo(
    () =>
      editQueryString(
        queryString,
        {
          columns: table
            .getVisibleFlatColumns()
            .map((c) => c.id)
            .join(","),
        },
        ["page"],
      ),
    [queryString, table.getVisibleFlatColumns()],
  );

  return (
    <div>
      <div className="flex justify-end">
        <div className="flex gap-1">
          <ExportButton
            queryString={exportQueryString}
            disabled={error || !data?.length}
          />
          <EditColumnsButton table={table} />
        </div>
      </div>
      <div className="mt-3">
        <Table {...tableProps} table={table} />
      </div>
    </div>
  );
}
