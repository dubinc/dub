"use client";

import { editQueryString } from "@/lib/analytics/utils";
import { generateRandomName } from "@/lib/names";
import { clickEventResponseSchema } from "@/lib/zod/schemas/clicks";
import { leadEventResponseSchema } from "@/lib/zod/schemas/leads";
import { saleEventResponseSchema } from "@/lib/zod/schemas/sales";
import EmptyState from "@/ui/shared/empty-state";
import {
  Avatar,
  CopyButton,
  CopyText,
  LinkLogo,
  Table,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CursorRays, Globe, Magnifier, QRCode } from "@dub/ui/src/icons";
import {
  CONTINENTS,
  COUNTRIES,
  REGIONS,
  capitalize,
  fetcher,
  getApexDomain,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import { Cell, ColumnDef } from "@tanstack/react-table";
import { Link2 } from "lucide-react";
import { ReactNode, useContext, useEffect, useMemo } from "react";
import useSWR from "swr";
import z from "zod";
import { AnalyticsContext } from "../analytics-provider";
import ContinentIcon from "../continent-icon";
import DeviceIcon from "../device-icon";
import EditColumnsButton from "./edit-columns-button";
import { EventsContext } from "./events-provider";
import { exampleData } from "./example-data";
import FilterButton from "./filter-button";
import { RowMenuButton } from "./row-menu-button";
import { eventColumns, useColumnVisibility } from "./use-column-visibility";

export type EventDatum =
  | z.infer<typeof clickEventResponseSchema>
  | z.infer<typeof leadEventResponseSchema>
  | z.infer<typeof saleEventResponseSchema>;

type ColumnMeta = {
  filterParams?: (
    args: Pick<Cell<EventDatum, any>, "getValue">,
  ) => Record<string, any>;
};

export default function EventsTable({
  requiresUpgrade,
  upgradeOverlay,
}: {
  requiresUpgrade?: boolean;
  upgradeOverlay?: ReactNode;
}) {
  const { searchParams, queryParams } = useRouterStuff();
  const { setExportQueryString } = useContext(EventsContext);
  const {
    selectedTab: tab,
    queryString: originalQueryString,
    eventsApiPath,
    totalEvents,
  } = useContext(AnalyticsContext);
  const { columnVisibility, setColumnVisibility } = useColumnVisibility();

  const sortBy = searchParams.get("sort") || "timestamp";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const columns = useMemo<ColumnDef<EventDatum, any>[]>(
    () =>
      [
        // Click trigger
        {
          id: "trigger",
          header: "Event",
          accessorKey: "qr",
          enableHiding: false,
          meta: {
            filterParams: ({ getValue }) => ({
              qr: !!getValue(),
            }),
          },
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3">
              {getValue() ? (
                <>
                  <QRCode className="size-4 shrink-0" />
                  <span className="truncate" title="QR scan">
                    QR scan
                  </span>
                </>
              ) : (
                <>
                  <CursorRays className="size-4 shrink-0" />
                  <span className="truncate" title="Link click">
                    Link click
                  </span>
                </>
              )}
            </div>
          ),
        },
        // Lead/sale event name
        {
          id: "event",
          header: "Event",
          accessorKey: "eventName",
          enableHiding: false,
          cell: ({ getValue }) =>
            (
              <span className="truncate" title={getValue()}>
                {getValue()}
              </span>
            ) || <span className="text-gray-400">-</span>,
        },
        {
          id: "customer",
          header: "Customer",
          accessorKey: "customer",
          cell: ({ getValue }) => {
            const customer = getValue();
            const display =
              customer.name || customer.email || generateRandomName();
            return (
              <Tooltip
                content={
                  <div className="w-full p-3">
                    <Avatar
                      user={{
                        name: customer.name,
                        email: customer.email,
                        image: customer.avatar,
                      }}
                      className="h-8 w-8"
                    />
                    <p className="mt-2 text-sm font-semibold text-gray-700">
                      {display}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <p>{customer.email}</p>
                      <CopyButton
                        value={customer.email}
                        variant="neutral"
                        className="p-1 [&>*]:h-3 [&>*]:w-3"
                        successMessage="Copied email to clipboard!"
                      />
                    </div>
                  </div>
                }
              >
                <div className="flex items-center gap-3" title={display}>
                  <img
                    alt={display}
                    src={customer.avatar}
                    className="size-4 shrink-0 rounded-full border border-gray-200"
                  />
                  <span className="truncate">{display}</span>
                </div>
              </Tooltip>
            );
          },
        },
        {
          id: "country",
          header: "Country",
          accessorKey: "click.country",
          meta: {
            filterParams: ({ getValue }) => ({ country: getValue() }),
          },
          cell: ({ getValue }) => (
            <div
              className="flex items-center gap-3"
              title={COUNTRIES[getValue()] ?? getValue()}
            >
              {getValue() === "Unknown" ? (
                <Globe className="size-4 shrink-0" />
              ) : (
                <img
                  alt={getValue()}
                  src={`https://hatscripts.github.io/circle-flags/flags/${getValue().toLowerCase()}.svg`}
                  className="size-4 shrink-0"
                />
              )}
              <span className="truncate">
                {COUNTRIES[getValue()] ?? getValue()}
              </span>
            </div>
          ),
        },
        {
          id: "city",
          header: "City",
          accessorKey: "click.city",
          meta: {
            filterParams: ({ getValue }) => ({ city: getValue() }),
          },
          minSize: 160,
          cell: ({ getValue, row }) => (
            <div className="flex items-center gap-3" title={getValue()}>
              {!row.original.country || row.original.country === "Unknown" ? (
                <Globe className="size-4 shrink-0" />
              ) : (
                <img
                  alt={row.original.country}
                  src={`https://hatscripts.github.io/circle-flags/flags/${row.original.country.toLowerCase()}.svg`}
                  className="size-4 shrink-0"
                />
              )}
              <span className="truncate">{getValue()}</span>
            </div>
          ),
        },
        {
          id: "region",
          header: "Region",
          accessorKey: "click.region",
          meta: {
            filterParams: ({ getValue }) => ({ region: getValue() }),
          },
          minSize: 160,
          cell: ({ getValue, row }) => (
            <div className="flex items-center gap-3" title={getValue()}>
              {!row.original.country || row.original.country === "Unknown" ? (
                <Globe className="size-4 shrink-0" />
              ) : (
                <img
                  alt={row.original.country}
                  src={`https://hatscripts.github.io/circle-flags/flags/${row.original.country.toLowerCase()}.svg`}
                  className="size-4 shrink-0"
                />
              )}
              <span className="truncate">
                {REGIONS[getValue()] || getValue().split("-")[1]}
              </span>
            </div>
          ),
        },
        {
          id: "continent",
          header: "Continent",
          accessorKey: "click.continent",
          meta: {
            filterParams: ({ getValue }) => ({ continent: getValue() }),
          },
          cell: ({ getValue }) => (
            <div
              className="flex items-center gap-3"
              title={CONTINENTS[getValue()] ?? "Unknown"}
            >
              <ContinentIcon display={getValue()} className="size-4 shrink-0" />
              <span className="truncate">
                {CONTINENTS[getValue()] ?? "Unknown"}
              </span>
            </div>
          ),
        },
        {
          id: "device",
          header: "Device",
          accessorKey: "click.device",
          meta: {
            filterParams: ({ getValue }) => ({ device: getValue() }),
          },
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3" title={getValue()}>
              <DeviceIcon
                display={capitalize(getValue()) ?? getValue()}
                tab="devices"
                className="size-4 shrink-0"
              />
              <span className="truncate">{getValue()}</span>
            </div>
          ),
        },
        {
          id: "browser",
          header: "Browser",
          accessorKey: "click.browser",
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3" title={getValue()}>
              <DeviceIcon
                display={capitalize(getValue()) ?? getValue()}
                tab="browsers"
                className="size-4 shrink-0 rounded-full"
              />
              <span className="truncate">{getValue()}</span>
            </div>
          ),
        },
        {
          id: "os",
          header: "OS",
          accessorKey: "click.os",
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3" title={getValue()}>
              <DeviceIcon
                display={capitalize(getValue()) ?? getValue()}
                tab="os"
                className="size-4 shrink-0"
              />
              <span className="truncate">{getValue()}</span>
            </div>
          ),
        },
        {
          id: "referer",
          header: "Referer",
          accessorKey: "click.referer",
          meta: {
            filterParams: ({ getValue }) => ({ referer: getValue() }),
          },
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3" title={getValue()}>
              {getValue() === "(direct)" ? (
                <Link2 className="h-4 w-4" />
              ) : (
                <LinkLogo
                  apexDomain={getValue()}
                  className="size-4 shrink-0 sm:size-4"
                />
              )}
              <span className="truncate">{getValue()}</span>
            </div>
          ),
        },
        {
          id: "refererUrl",
          header: "Referrer URL",
          accessorKey: "click.refererUrl",
          meta: {
            filterParams: ({ getValue }) => ({ refererUrl: getValue() }),
          },
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3">
              {getValue() === "(direct)" ? (
                <Link2 className="h-4 w-4" />
              ) : (
                <LinkLogo
                  apexDomain={getApexDomain(getValue())}
                  className="size-4 shrink-0 sm:size-4"
                />
              )}
              <CopyText
                value={getValue()}
                successMessage="Copied referrer URL to clipboard!"
              >
                <span className="truncate" title={getValue()}>
                  {getPrettyUrl(getValue())}
                </span>
              </CopyText>
            </div>
          ),
        },
        {
          id: "ip",
          header: "IP Address",
          accessorKey: "click.ip",
          cell: ({ getValue }) =>
            getValue() ? (
              <span className="truncate" title={getValue()}>
                {getValue()}
              </span>
            ) : (
              <Tooltip content="We do not record IP addresses for EU users.">
                <span className="cursor-default truncate underline decoration-dotted">
                  Unknown
                </span>
              </Tooltip>
            ),
        },
        // Sale amount
        {
          id: "saleAmount",
          header: "Sale Amount",
          accessorKey: "sale.amount",
          minSize: 120,
          cell: ({ getValue }) => (
            <div className="flex items-center gap-2">
              <span>${nFormatter(getValue() / 100)}</span>
              <span className="text-gray-400">USD</span>
            </div>
          ),
        },
        // Date
        {
          id: "timestamp",
          header: "Date",
          accessorFn: (d: { timestamp: string }) => new Date(d.timestamp),
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
        // Menu
        {
          id: "menu",
          enableHiding: false,
          minSize: 43,
          size: 43,
          maxSize: 43,
          header: ({ table }) => <EditColumnsButton table={table} />,
          cell: ({ row }) => <RowMenuButton row={row} />,
        },
      ].filter((c) => c.id === "menu" || eventColumns[tab].all.includes(c.id)),
    [tab],
  );

  const { pagination, setPagination } = usePagination();

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

  // Update export query string
  useEffect(
    () =>
      setExportQueryString?.(
        editQueryString(
          queryString,
          {
            columns: Object.entries(columnVisibility[tab])
              .filter(([, visible]) => visible)
              .map(([id]) => id)
              .join(","),
          },
          ["page"],
        ),
      ),
    [setExportQueryString, queryString, columnVisibility, tab],
  );

  const { data, isLoading, error } = useSWR<EventDatum[]>(
    !requiresUpgrade && `${eventsApiPath || "/api/events"}?${queryString}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { table, ...tableProps } = useTable({
    data: (data ?? (requiresUpgrade ? exampleData[tab] : [])) as EventDatum[],
    loading: isLoading,
    error: error && !requiresUpgrade ? "Failed to fetch events." : undefined,
    columns,
    pagination,
    onPaginationChange: setPagination,
    rowCount: requiresUpgrade ? 0 : totalEvents?.[tab] ?? 0,
    columnVisibility: columnVisibility[tab],
    onColumnVisibilityChange: (args) => setColumnVisibility(tab, args),
    sortableColumns: ["timestamp"],
    sortBy: sortBy,
    sortOrder: order,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sort: sortBy }),
          ...(sortOrder && { order: sortOrder }),
        },
      }),
    columnPinning: { right: ["menu"] },
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as ColumnMeta | undefined;

      return (
        meta?.filterParams && <FilterButton set={meta.filterParams(cell)} />
      );
    },
    emptyState: (
      <EmptyState
        icon={Magnifier}
        title="No events recorded"
        description={`Events will appear here when your links ${tab === "clicks" ? "are clicked on" : `convert to ${tab}`}`}
      />
    ),
    resourceName: (plural) => `event${plural ? "s" : ""}`,
  });

  return (
    <Table
      {...tableProps}
      table={table}
      scrollWrapperClassName={requiresUpgrade ? "overflow-x-hidden" : undefined}
    >
      {requiresUpgrade && (
        <>
          <div className="absolute inset-0 flex touch-pan-y items-center justify-center bg-gradient-to-t from-[#fff_70%] to-[#fff6]">
            {upgradeOverlay}
          </div>
          <div className="h-[400px]" />
        </>
      )}
    </Table>
  );
}
