"use client";

import { editQueryString } from "@/lib/analytics/utils";
import {
  Button,
  LinkLogo,
  LoadingSpinner,
  Tooltip,
  useRouterStuff,
} from "@dub/ui";
import { SortOrder } from "@dub/ui/src/icons";
import { COUNTRIES, capitalize, cn, fetcher, getApexDomain } from "@dub/utils";
import {
  ColumnDef,
  PaginationState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import { useContext, useMemo, useState } from "react";
import useSWR from "swr";
import { AnalyticsContext } from "../analytics-provider";
import DeviceIcon from "../device-icon";

const PAGE_SIZE = 20;
const tableCellClassName =
  "border-r border-b border-gray-200 px-4 py-2.5 text-left text-sm leading-6";

type FakeDatum = {
  link: { id: string; domain: string; key: string };
  country: string;
  device: string;
  timestamp: string;
};

export default function EventsTable() {
  const { searchParams, queryParams } = useRouterStuff();
  const tab = searchParams.get("tab") || "clicks";

  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const columns = useMemo<ColumnDef<FakeDatum, any>[]>(
    () => [
      {
        header: "Link",
        accessorKey: "link",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-3 sm:min-w-[125px]">
            <LinkLogo
              apexDomain={getApexDomain(getValue().url)}
              className="h-4 w-4 sm:h-4 sm:w-4"
            />
            <span>
              <span className="font-medium text-gray-950">
                {getValue().domain}
              </span>
              {getValue().key === "_root" ? "" : `/${getValue().key}`}
            </span>
          </div>
        ),
      },
      {
        header: "Country",
        accessorKey: "country",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-3">
            <img
              alt={getValue()}
              src={`https://flag.vercel.app/m/${getValue()}.svg`}
              className="h-2.5 w-4"
            />
            <span>{COUNTRIES[getValue()] ?? getValue()}</span>
          </div>
        ),
      },
      {
        header: "Device",
        accessorKey: "device",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-3">
            <DeviceIcon
              display={capitalize(getValue()) ?? getValue()}
              tab="devices"
              className="h-4 w-4"
            />
            <span>{getValue()}</span>
          </div>
        ),
      },
      {
        id: "timestamp",
        header: "Date",
        accessorFn: (d) => new Date(d.timestamp),
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
            <span>
              {getValue().toLocaleTimeString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              })}
            </span>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  const defaultData = useMemo(() => [], []);

  const { queryString, totalEvents } = useContext(AnalyticsContext);

  const { data, isLoading, error } = useSWR<FakeDatum[]>(
    `/api/analytics/events?${editQueryString(queryString, {
      event: tab,
      offset: (pagination.pageIndex * pagination.pageSize).toString(),
      limit: pagination.pageSize.toString(),
      order,
    }).toString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  console.log(data);

  const table = useReactTable({
    data: data ?? defaultData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    rowCount: totalEvents?.[tab] ?? 0,
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
    manualPagination: true,
    autoResetPageIndex: false,
    manualSorting: true,
  });

  return (
    <div className="border border-gray-200 bg-white sm:rounded-xl">
      <div className="relative rounded-[inherit]">
        {!error && !!data?.length ? (
          <div className="min-h-[400px] rounded-[inherit]">
            <table
              className={cn(
                "w-full border-separate border-spacing-0",

                // Remove side borders from table to avoid interfering with outer border
                "[&_thead_tr:first-child>*]:border-t-0", // Top row
                "[&_tbody_tr:last-child>*]:border-b-0", // Bottom row
                "[&_tr>*:first-child]:border-l-0", // Left column
                "[&_tr>*:last-child]:border-r-0", // Right column
              )}
            >
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isDateColumn = header.column.id === "timestamp";
                      return (
                        <th
                          key={header.id}
                          className={cn(tableCellClassName, "font-medium")}
                          style={{ width: `${header.getSize()}px` }}
                        >
                          <button
                            className="flex items-center gap-2"
                            disabled={!isDateColumn}
                            onClick={() =>
                              queryParams({
                                set: {
                                  order: order === "asc" ? "desc" : "asc",
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
                            {isDateColumn && <SortOrder order={order} />}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(tableCellClassName, "text-gray-600")}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-64 h-full w-full items-center justify-center text-sm text-gray-500">
            {error ? "Failed to fetch data" : "No data available"}
          </div>
        )}
        <div className="sticky bottom-0 flex items-center justify-between rounded-b-[inherit] border-t border-gray-200 bg-white px-4 py-3.5 text-sm leading-6 text-gray-600">
          <div>
            Viewing{" "}
            <span className="font-medium">
              {pagination.pageIndex * pagination.pageSize + 1}-
              {Math.min(
                pagination.pageIndex * pagination.pageSize +
                  pagination.pageSize,
                table.getRowCount(),
              )}
            </span>{" "}
            of{" "}
            <span className="font-medium">
              {table.getRowCount().toLocaleString()}
            </span>{" "}
            events
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              text="Previous"
              className="h-7 px-2"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            />
            <Button
              variant="secondary"
              text="Next"
              className="h-7 px-2"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            />
          </div>
        </div>

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
  );
}
