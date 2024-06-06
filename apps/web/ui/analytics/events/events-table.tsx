"use client";

import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, LinkLogo, LoadingSpinner } from "@dub/ui";
import { COUNTRIES, capitalize, cn, fetcher, getApexDomain } from "@dub/utils";
import {
  ColumnDef,
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import useSWR from "swr";
import { AnalyticsContext } from "../analytics-provider";
import DeviceIcon from "../device-icon";

const PAGE_SIZE = 15;
const tableCellClassName =
  "border-r border-b border-gray-200 px-4 py-2.5 text-left text-sm leading-6";

type FakeDatum = {
  link: { domain: string; key: string; url: string };
  country: string;
  device: string;
  date: string;
};

export default function EventsTable() {
  const { id: workspaceId } = useWorkspace();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  const columns = useMemo<ColumnDef<FakeDatum, any>[]>(
    () => [
      {
        header: "Link",
        enableSorting: false,
        accessorKey: "link",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-3">
            <LinkLogo
              apexDomain={getApexDomain(getValue().url)}
              className="h-4 w-4 sm:h-4 sm:w-4"
            />
            <span>
              <span className="font-medium text-gray-950">
                {getValue().domain}
              </span>
              /{getValue().key}
            </span>
          </div>
        ),
      },
      {
        header: "Country",
        enableSorting: false,
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
        enableSorting: false,
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
        id: "date",
        header: "Date",
        enableSorting: true,
        accessorFn: (d) =>
          new Date(d.date).toLocaleTimeString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }),
      },
    ],
    [],
  );

  const defaultData = useMemo(() => [], []);

  const { queryString, totalEvents } = useContext(AnalyticsContext);

  const { data, isLoading } = useSWR<FakeDatum[]>(
    `/api/analytics/events?${editQueryString(queryString, {
      pageIndex: pagination.pageIndex.toString(),
      pageSize: pagination.pageSize.toString(),
      sortBy: sorting?.[0]?.id ?? "date",
      sortOrder: sorting?.[0]?.desc ?? true ? "desc" : "asc",
    }).toString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const table = useReactTable({
    data: data ?? defaultData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    rowCount: totalEvents?.clicks ?? 0,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      pagination,
      sorting,
    },
    manualPagination: true,
    autoResetPageIndex: false,
    manualSorting: true,
  });

  return (
    <div className="border border-gray-200 bg-white sm:rounded-xl">
      <div className="relative rounded-[inherit]">
        {/* Could make this scrollable */}
        <div className="scrollbar-hide min-h-[400px] overflow-y-auto rounded-[inherit]">
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
                  {headerGroup.headers.map((header, idx) => (
                    <th
                      key={header.id}
                      className={cn(tableCellClassName, "font-medium")}
                    >
                      <button
                        className="flex items-center gap-1"
                        disabled={!header.column.getCanSort()}
                        onClick={() => header.column.toggleSorting()}
                      >
                        <span>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </span>
                        {header.column.getIsSorted() && (
                          <span>
                            <ChevronUp
                              className={cn(
                                "h-3.5 w-3.5 transition-transform",
                                header.column.getIsSorted() === "desc" &&
                                  "rotate-180",
                              )}
                              transform=""
                            />
                          </span>
                        )}
                      </button>
                    </th>
                  ))}
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
        <div className="sticky bottom-0 flex items-center justify-between rounded-b-[inherit] border-t border-gray-200 bg-white px-4 py-3.5 text-sm leading-6 text-gray-600">
          <div>
            Viewing{" "}
            <span className="font-medium">
              {pagination.pageIndex * pagination.pageSize + 1}-
              {pagination.pageIndex * pagination.pageSize + pagination.pageSize}
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

        {/* Loading overlay */}
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
