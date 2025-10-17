"use client";

import { editQueryString } from "@/lib/analytics/utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspacePreferences } from "@/lib/swr/use-workspace-preferences";
import { ClickEvent, LeadEvent, SaleEvent } from "@/lib/types";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import EmptyState from "@/ui/shared/empty-state";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import {
  CopyText,
  EditColumnsButton,
  LinkLogo,
  Table,
  TimestampTooltip,
  Tooltip,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Globe, Magnifier } from "@dub/ui/icons";
import {
  CONTINENTS,
  COUNTRIES,
  REGIONS,
  capitalize,
  cn,
  currencyFormatter,
  fetcher,
  formatDateTimeSmart,
  getApexDomain,
  getPrettyUrl,
} from "@dub/utils";
import { Cell, ColumnDef } from "@tanstack/react-table";
import { Link2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ReactNode, useCallback, useContext, useEffect, useMemo } from "react";
import useSWR from "swr";
import { AnalyticsContext } from "../analytics-provider";
import ContinentIcon from "../continent-icon";
import DeviceIcon from "../device-icon";
import { TRIGGER_DISPLAY } from "../trigger-display";
import { EventsContext } from "./events-provider";
import { EXAMPLE_EVENTS_DATA } from "./example-data";
import { MetadataViewer } from "./metadata-viewer";
import { RowMenuButton } from "./row-menu-button";

const eventColumns = {
  clicks: {
    all: [
      "timestamp",
      "trigger",
      "link",
      "url",
      "country",
      "city",
      "region",
      "continent",
      "device",
      "browser",
      "os",
      "referer",
      "refererUrl",
      "clickId",
      "ip",
    ],
    defaultVisible: ["timestamp", "link", "referer", "country", "device"],
  },
  leads: {
    all: [
      "timestamp",
      "event",
      "link",
      "url",
      "customer",
      "country",
      "city",
      "region",
      "continent",
      "device",
      "browser",
      "os",
      "referer",
      "refererUrl",
      "ip",
      "clickId",
      "metadata",
    ],
    defaultVisible: ["timestamp", "event", "link", "customer", "referer"],
  },
  sales: {
    all: [
      "timestamp",
      "saleAmount",
      "event",
      "customer",
      "link",
      "url",
      "invoiceId",
      "country",
      "city",
      "region",
      "continent",
      "device",
      "browser",
      "os",
      "referer",
      "refererUrl",
      "ip",
      "clickId",
      "metadata",
    ],
    defaultVisible: [
      "timestamp",
      "saleAmount",
      "event",
      "customer",
      "referer",
      "link",
    ],
  },
};

export type EventDatum = ClickEvent | LeadEvent | SaleEvent;

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
  const { slug } = useWorkspace();
  const { searchParams, queryParams } = useRouterStuff();
  const { setExportQueryString } = useContext(EventsContext);
  const {
    selectedTab: tab,
    queryString: originalQueryString,
    eventsApiPath,
    totalEvents,
    partnerPage,
  } = useContext(AnalyticsContext);

  const { programSlug } = useParams<{ programSlug: string }>();

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "events-table-columns",
    eventColumns,
  );

  const [persisted] = useWorkspacePreferences("linksDisplay");

  const shortLinkTitle = useCallback(
    (d: { url?: string; title?: string; shortLink?: string }) => {
      const displayProperties = persisted?.displayProperties;

      if (displayProperties?.includes("title") && d.title) {
        return d.title;
      }

      return d.shortLink || "Unknown";
    },
    [persisted],
  );

  const sortBy = searchParams.get("sortBy") || "timestamp";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const columns = useMemo<ColumnDef<EventDatum, any>[]>(
    () =>
      [
        // Date
        {
          id: "timestamp",
          header: "Date",
          accessorFn: (d: { timestamp: string }) => new Date(d.timestamp),
          enableHiding: false,
          size: 160,
          cell: ({ getValue }) => (
            <TimestampTooltip
              timestamp={getValue()}
              side="right"
              rows={["local", "utc", "unix"]}
              interactive
            >
              <span className="select-none truncate">
                {formatDateTimeSmart(getValue())}
              </span>
            </TimestampTooltip>
          ),
        },
        // Sale amount
        {
          id: "saleAmount",
          header: "Amount",
          accessorKey: "sale.amount",
          size: 160,
          cell: ({ getValue }) => (
            <div className="flex items-center gap-2">
              <span>
                {currencyFormatter(getValue() / 100, {
                  trailingZeroDisplay: "stripIfInteger",
                })}
              </span>
              <span className="text-neutral-400">USD</span>
            </div>
          ),
        },
        // Click trigger
        {
          id: "trigger",
          header: "Trigger",
          accessorKey: "click.trigger",
          minSize: 150,
          size: 150,
          maxSize: 150,
          meta: {
            filterParams: ({ getValue }) => ({
              trigger: getValue() ?? "link",
            }),
          },
          cell: ({ getValue }) => {
            const { title, icon: Icon } = TRIGGER_DISPLAY[getValue() ?? "link"];
            return (
              <div className="flex items-center gap-3">
                <Icon className="size-4 shrink-0" />
                <span className="truncate" title={title}>
                  {title}
                </span>
              </div>
            );
          },
        },
        // Lead/sale event name
        {
          id: "event",
          header: "Event",
          accessorKey: "eventName",
          cell: ({ getValue }) =>
            getValue() ? (
              <span className="truncate" title={getValue()}>
                {getValue()}
              </span>
            ) : (
              <span className="text-neutral-400">-</span>
            ),
        },
        {
          id: "customer",
          header: "Customer",
          accessorKey: "customer",
          minSize: 300,
          size: 300,
          maxSize: 400,
          cell: ({ getValue }) => (
            <CustomerRowItem
              customer={getValue()}
              href={
                partnerPage
                  ? `/programs/${programSlug}/customers/${getValue().id}`
                  : `/${slug}/customers/${getValue().id}`
              }
              className="px-4 py-2.5"
            />
          ),
          meta: {
            filterParams: ({ getValue }) => ({
              customerId: getValue().id,
            }),
          },
        },
        {
          id: "link",
          header: "Link",
          accessorKey: "link",
          minSize: 250,
          size: 250,
          maxSize: 400,
          meta: {
            filterParams: ({ getValue }) => ({
              domain: getValue().domain,
              key: getValue().key,
            }),
          },
          cell: ({ getValue }) => {
            const content = (
              <div
                className={cn(
                  "flex items-center gap-3",
                  !partnerPage &&
                    "cursor-alias decoration-dotted hover:underline",
                )}
              >
                <LinkLogo
                  apexDomain={getApexDomain(getValue().url)}
                  className="size-4 shrink-0 sm:size-4"
                />
                <span className="truncate" title={shortLinkTitle(getValue())}>
                  {getPrettyUrl(shortLinkTitle(getValue()))}
                </span>
              </div>
            );

            return partnerPage ? (
              content
            ) : (
              <Link
                href={`/${slug}/links/${getValue().domain}/${getValue().key}`}
                target="_blank"
              >
                {content}
              </Link>
            );
          },
        },
        {
          id: "url",
          header: "Destination URL",
          accessorKey: "click.url",
          minSize: 250,
          size: 250,
          meta: {
            filterParams: ({ getValue }) => ({ url: getValue() }),
          },
          cell: ({ getValue }) => (
            <div className="flex items-center gap-3">
              <LinkLogo
                apexDomain={getApexDomain(getValue())}
                className="size-4 shrink-0 sm:size-4"
              />
              <CopyText
                value={getValue()}
                successMessage="Copied referrer URL to clipboard!"
              >
                <span className="overflow-scroll" title={getValue()}>
                  {getPrettyUrl(getValue())}
                </span>
              </CopyText>
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
              <CopyText
                value={getValue()}
                successMessage="Copied referrer to clipboard!"
              >
                <span className="truncate">{getValue()}</span>
              </CopyText>
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
        ...(partnerPage
          ? []
          : [
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
              // Sale invoice ID
              {
                id: "invoiceId",
                header: "Invoice ID",
                accessorKey: "sale.invoiceId",
                maxSize: 200,
                cell: ({ getValue }) =>
                  getValue() ? (
                    <span className="truncate" title={getValue()}>
                      {getValue()}
                    </span>
                  ) : (
                    <span className="text-neutral-400">-</span>
                  ),
              },
              // Click ID
              {
                id: "clickId",
                header: "Click ID",
                accessorKey: "click.id",
                maxSize: 200,
                cell: ({ getValue }) =>
                  getValue() ? (
                    <CopyText
                      value={getValue()}
                      successMessage="Copied click ID to clipboard!"
                    >
                      <span className="truncate font-mono" title={getValue()}>
                        {getValue()}
                      </span>
                    </CopyText>
                  ) : (
                    <span className="text-neutral-400">-</span>
                  ),
              },
              // Metadata
              {
                id: "metadata",
                header: "Metadata",
                accessorKey: "metadata",
                minSize: 120,
                size: 120,
                maxSize: 120,
                cell: ({ getValue }) => {
                  const metadata = getValue();
                  if (!metadata || Object.keys(metadata).length === 0) {
                    return <span className="text-neutral-400">-</span>;
                  }
                  return (
                    <MetadataViewer metadata={metadata} previewItems={0} />
                  );
                },
              },
            ]),
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
      ]
        .filter((c) => c.id === "menu" || eventColumns[tab].all.includes(c.id))
        .map((col) => ({
          ...col,
          enableResizing: true,
          size: col.size || Math.max(200, col.minSize || 100),
          minSize: col.minSize || 100,
          maxSize: col.maxSize || 1000,
        })),
    [tab, partnerPage],
  );

  const { pagination, setPagination } = usePagination();

  const queryString = useMemo(
    () =>
      editQueryString(originalQueryString, {
        event: tab,
        page: pagination.pageIndex.toString(),
        sortBy,
        sortOrder,
      }).toString(),
    [originalQueryString, tab, pagination, sortBy, sortOrder],
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
    data: (data ??
      (requiresUpgrade ? EXAMPLE_EVENTS_DATA[tab] : [])) as EventDatum[],
    loading: isLoading,
    error: error && !requiresUpgrade ? "Failed to fetch events." : undefined,
    columns,
    enableColumnResizing: true,
    pagination,
    onPaginationChange: setPagination,
    rowCount: requiresUpgrade ? 0 : totalEvents?.[tab] ?? 0,
    columnVisibility: columnVisibility[tab],
    onColumnVisibilityChange: (args) => setColumnVisibility(tab, args),
    sortableColumns: ["timestamp"],
    sortBy,
    sortOrder,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
      }),
    columnPinning: { right: ["menu"] },
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
      return (
        meta?.filterParams && (
          <FilterButtonTableRow
            set={meta.filterParams(cell)}
            className="bg-[linear-gradient(to_right,transparent,white_10%)]"
          />
        )
      );
    },
    tdClassName: (columnId) => (columnId === "customer" ? "p-0" : ""),
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
    <>
      <Table
        {...tableProps}
        table={table}
        scrollWrapperClassName={
          requiresUpgrade ? "overflow-x-hidden" : undefined
        }
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
    </>
  );
}
