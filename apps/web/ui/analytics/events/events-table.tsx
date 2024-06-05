"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button, LinkLogo } from "@dub/ui";
import { COUNTRIES, capitalize, cn, fetcher, getApexDomain } from "@dub/utils";
import {
  ColumnDef,
  PaginationState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import useSWR from "swr";
import DeviceIcon from "../device-icon";

const PAGE_SIZE = 20;
const tableCellClassName =
  "border-r border-b border-gray-200 px-4 py-3 text-left text-sm leading-6";

type FakeDatum = {
  link: { domain: string; key: string; url: string };
  country: string;
  device: string;
  date: string;
};

export default function EventsTable() {
  const { id: workspaceId, slug, betaTester } = useWorkspace();

  const columns = useMemo<ColumnDef<FakeDatum, any>[]>(
    () => [
      {
        header: "Link",
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
        header: "Date",
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

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const defaultData = useMemo(() => [], []);

  const path = useMemo(
    () =>
      `/api/analytics/events?${new URLSearchParams({
        ...(workspaceId && { workspaceId }),
        pageIndex: pagination.pageIndex.toString(),
        pageSize: pagination.pageSize.toString(),
      }).toString()}`,
    [workspaceId, pagination],
  );

  const { data } = useSWR<{ events: FakeDatum[]; totalRows: number }>(
    path,
    fetcher,
  );

  const table = useReactTable({
    data: data?.events ?? defaultData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    rowCount: data?.totalRows,
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
    autoResetPageIndex: false,
  });

  return (
    <div className="border border-gray-200 bg-white sm:rounded-xl">
      <div className="scrollbar-hide max-h-[615px] overflow-y-auto rounded-[inherit]">
        <table
          className={cn(
            "relative w-full border-separate border-spacing-0",

            // Remove side borders from table to avoid interfering with outer border
            "[&_thead_tr:first-child>*]:border-t-0", // Top row
            "[&_tbody_tr:last-child>*]:border-b-0", // Bottom row
            "[&_tr>*:first-child]:border-l-0", // Left column
            "[&_tr>*:last-child]:border-r-0", // Right column
          )}
        >
          <thead className="sticky top-0 z-10 bg-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => (
                  <th
                    key={header.id}
                    className={cn(tableCellClassName, "font-medium")}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3.5 text-sm leading-6 text-gray-600">
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
    </div>
  );
}
