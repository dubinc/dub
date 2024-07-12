"use client";

import { editQueryString } from "@/lib/analytics/utils";
import { clickEventEnrichedSchema } from "@/lib/zod/schemas/clicks";
import { leadEventEnrichedSchema } from "@/lib/zod/schemas/leads";
import { saleEventEnrichedSchema } from "@/lib/zod/schemas/sales";
import Pagination from "@/ui/shared/pagination";
import {
  CursorRays,
  LinkLogo,
  LoadingSpinner,
  QRCode,
  Tooltip,
  useRouterStuff,
} from "@dub/ui";
import { FilterBars, SortOrder } from "@dub/ui/src/icons";
import {
  COUNTRIES,
  PAGINATION_LIMIT,
  capitalize,
  cn,
  fetcher,
  getApexDomain,
  nFormatter,
} from "@dub/utils";
import {
  Cell,
  ColumnDef,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import z from "zod";
import { AnalyticsContext } from "../analytics-provider";
import DeviceIcon from "../device-icon";
import EditColumnsButton from "./edit-columns-button";
import EmptyState from "./empty-state";
import ExportButton from "./export-button";
import usePagination from "./use-pagination";

const tableCellClassName =
  "border-r border-b border-gray-200 px-4 py-2.5 text-left text-sm leading-6 whitespace-nowrap";

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
  const { searchParams, queryParams } = useRouterStuff();
  const tab = searchParams.get("tab") || "clicks";

  const sortBy = searchParams.get("sort") || "timestamp";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const { pagination, setPagination } = usePagination(PAGINATION_LIMIT);

  const scrollContainer = useRef<HTMLDivElement>(null);

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
    },
  );

  const table = useReactTable({
    data: data ?? defaultData,
    rowCount: totalEvents?.[tab] ?? 0,
    columns,
    defaultColumn: {
      minSize: 60,
      size: 150,
      maxSize: 250,
    },
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      pagination,
      columnVisibility,
    },
    manualPagination: true,
    autoResetPageIndex: false,
    manualSorting: true,
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

  // Memoize column sizes to pass to table as CSS variables
  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes: { [key: string]: number } = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!;
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [
    columns,
    columnVisibility,
    table.getState().columnSizingInfo,
    table.getState().columnSizing,
  ]);

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
      <div className="mt-3 border border-gray-200 bg-white sm:rounded-xl">
        <div className="relative rounded-[inherit]">
          {(!error && !!data?.length) || isLoading ? (
            <div
              ref={scrollContainer}
              className="min-h-[400px] overflow-x-auto rounded-[inherit]"
            >
              <table
                className={cn(
                  "w-full table-fixed border-separate border-spacing-0",

                  // Remove side borders from table to avoid interfering with outer border
                  "[&_thead_tr:first-child>*]:border-t-0", // Top row
                  "[&_tr>*:first-child]:border-l-0", // Left column
                  "[&_tr>*:last-child]:border-r-0", // Right column
                )}
                style={columnSizeVars}
              >
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header, columnIdx) => {
                        const isSortableColumn = [
                          "timestamp",
                          "amount",
                        ].includes(header.column.id);
                        return (
                          <th
                            key={`${tab}-${header.id}`}
                            className={cn(
                              tableCellClassName,
                              "relative select-none font-medium",
                            )}
                            style={{
                              width: `calc(var(--header-${header?.id}-size) * 1px)`,
                            }}
                          >
                            <div className="flex items-center justify-between gap-6 !pr-0">
                              <button
                                type="button"
                                className="flex items-center gap-2"
                                disabled={!isSortableColumn}
                                onClick={() =>
                                  queryParams({
                                    set: {
                                      sort: header.column.id,
                                      order:
                                        sortBy !== header.column.id
                                          ? "desc"
                                          : order === "asc"
                                            ? "desc"
                                            : "asc",
                                    },
                                  })
                                }
                                aria-label="Sort by column"
                              >
                                <span>
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                      )}
                                </span>
                                {isSortableColumn && (
                                  <SortOrder
                                    order={
                                      sortBy === header.column.id ? order : null
                                    }
                                  />
                                )}
                              </button>
                            </div>
                            <div
                              className="absolute -right-[4px] top-0 z-[1] h-full w-[7px] cursor-col-resize"
                              {...{
                                onDoubleClick: () => header.column.resetSize(),
                                onMouseDown: header.getResizeHandler(),
                                onTouchStart: header.getResizeHandler(),
                              }}
                            />
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as
                          | ColumnMeta
                          | undefined;

                        return (
                          <td
                            key={`${tab}-${cell.id}`}
                            className={cn(
                              tableCellClassName,
                              "group relative text-gray-600",
                            )}
                            style={{
                              width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                            }}
                          >
                            <div className="flex w-full items-center justify-between overflow-hidden truncate">
                              <div className="min-w-0 shrink">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </div>
                              {meta?.filterParams && (
                                <FilterButton set={meta.filterParams(cell)} />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-96 w-full items-center justify-center text-sm text-gray-500">
              {error ? (
                "Failed to fetch data"
              ) : tab === "clicks" ? (
                "No data available"
              ) : (
                <EmptyState />
              )}
            </div>
          )}
          <Pagination
            pageSize={PAGINATION_LIMIT}
            totalCount={totalEvents?.[tab] ?? 0}
          />

          {/* Loading/error overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-white/50"
              >
                <LoadingSpinner />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
