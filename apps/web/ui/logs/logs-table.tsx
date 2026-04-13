"use client";

import {
  API_LOGS_MAX_PAGE_SIZE,
  API_LOGS_PRESETS_BY_RETENTION,
  API_LOG_RETENTION_DAYS,
  METHOD_BADGE_VARIANTS,
} from "@/lib/api-logs/constants";
import { useApiLogsCount } from "@/lib/swr/use-api-logs-count";
import useWorkspace from "@/lib/swr/use-workspace";
import type { PlanProps } from "@/lib/types";
import { EnrichedApiLog } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import { UserAvatar } from "@/ui/users/user-avatar";
import {
  AnimatedSizeContainer,
  EditColumnsButton,
  Filter,
  StatusBadge,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { StackY3 } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import { Cell, Row } from "@tanstack/react-table";
import { subDays } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { getStatusCodeBadgeVariant } from "./log-utils";
import { useLogFilters } from "./use-log-filters";

const LOGS_TABLE_COLUMNS = {
  all: [
    "path",
    "method",
    "status_code",
    "actor",
    "duration",
    "timestamp",
    "api_key",
  ],
  defaultVisible: [
    "path",
    "method",
    "status_code",
    "actor",
    "duration",
    "timestamp",
  ],
};

export function LogsTable() {
  const router = useRouter();
  const { id: workspaceId, slug, plan } = useWorkspace();
  const { searchParamsObj } = useRouterStuff();

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    setSelectedFilter,
  } = useLogFilters();

  const { pagination, setPagination } = usePagination(API_LOGS_MAX_PAGE_SIZE);

  const logsQuery = searchParamsObj.page
    ? `${searchQuery}&page=${searchParamsObj.page}`
    : searchQuery;

  const {
    data: logs,
    error,
    isLoading,
  } = useSWR<EnrichedApiLog[]>(
    workspaceId && `/api/logs?${logsQuery}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: logsCountRows } = useApiLogsCount();

  const logsCount =
    logsCountRows?.find((row) => row.routePattern === "all")?.count ?? 0;

  const isFiltered = activeFilters.length > 0;

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "api-logs-table-columns",
    LOGS_TABLE_COLUMNS,
  );

  const columns = useMemo(
    () =>
      [
        {
          id: "path",
          header: "Endpoint",
          cell: ({ row }: { row: Row<EnrichedApiLog> }) => (
            <span
              className="truncate"
              title={row.original.route_pattern || undefined}
            >
              {row.original.path}
            </span>
          ),
          meta: {
            filterParams: ({ row }: { row: Row<EnrichedApiLog> }) => ({
              routePattern: row.original.route_pattern,
            }),
          },
          size: 300,
        },
        {
          id: "method",
          header: "Method",
          cell: ({ row }: { row: Row<EnrichedApiLog> }) => (
            <StatusBadge
              variant={METHOD_BADGE_VARIANTS[row.original.method] ?? "neutral"}
              icon={null}
            >
              {row.original.method}
            </StatusBadge>
          ),
          meta: {
            filterParams: ({ row }: { row: Row<EnrichedApiLog> }) => ({
              method: row.original.method,
            }),
          },
          size: 100,
        },
        {
          id: "status_code",
          header: "Status",
          cell: ({ row }: { row: Row<EnrichedApiLog> }) => (
            <StatusBadge
              variant={getStatusCodeBadgeVariant(row.original.status_code)}
              icon={null}
            >
              {row.original.status_code}
            </StatusBadge>
          ),
          meta: {
            filterParams: ({ row }: { row: Row<EnrichedApiLog> }) => ({
              statusCode: row.original.status_code,
            }),
          },
          size: 100,
        },
        {
          id: "actor",
          header: "Actor",
          cell: ({ row }: { row: Row<EnrichedApiLog> }) => {
            const { user } = row.original;
            if (user) {
              return (
                <div className="flex items-center gap-2">
                  <UserAvatar user={user} className="size-4" />
                  <span className="truncate text-sm text-neutral-500">
                    {user.name || user.email}
                  </span>
                </div>
              );
            }

            return <span className="text-sm text-neutral-400">—</span>;
          },
          size: 200,
        },
        {
          id: "api_key",
          header: "API Key",
          cell: ({ row }: { row: Row<EnrichedApiLog> }) => {
            const token = row.original.token;
            if (!token) {
              return <span className="text-sm text-neutral-400">—</span>;
            }
            return (
              <span
                className="truncate font-mono text-sm text-neutral-500"
                title={
                  token.name
                    ? `${token.partialKey} (${token.name})`
                    : token.partialKey
                }
              >
                {token.partialKey}
                {token.name && (
                  <span className="ml-1 font-sans text-neutral-400">
                    ({token.name})
                  </span>
                )}
              </span>
            );
          },
          meta: {
            filterParams: ({ row }: { row: Row<EnrichedApiLog> }) =>
              row.original.token?.id
                ? { tokenId: row.original.token.id }
                : undefined,
          },
          size: 200,
        },
        {
          id: "duration",
          header: "Duration",
          cell: ({ row }: { row: Row<EnrichedApiLog> }) => (
            <span className="text-sm text-neutral-500">
              {row.original.duration}ms
            </span>
          ),
          size: 100,
        },
        {
          id: "timestamp",
          header: "Time",
          cell: ({ row }: { row: Row<EnrichedApiLog> }) => (
            <TimestampTooltip
              timestamp={row.original.timestamp}
              rows={["local", "utc", "unix"]}
              side="left"
              delayDuration={150}
            >
              <span className="text-sm text-neutral-500">
                {new Date(row.original.timestamp).toLocaleString("en-us", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </TimestampTooltip>
          ),
          size: 180,
        },
        {
          id: "menu",
          enableHiding: false,
          header: ({ table }) => <EditColumnsButton table={table} />,
          cell: () => null,
        },
      ].filter((c) => c.id === "menu" || LOGS_TABLE_COLUMNS.all.includes(c.id)),
    [],
  );

  const getLogUrl = (row: Row<EnrichedApiLog>) =>
    `/${slug}/settings/logs/${row.original.id}`;

  const { table, ...tableProps } = useTable({
    data: logs || [],
    columns,
    columnPinning: { right: ["menu"] },
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    pagination,
    onPaginationChange: setPagination,
    onRowClick: (row, e) => {
      const url = getLogUrl(row);
      if (e.metaKey || e.ctrlKey) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    },
    onRowAuxClick: (row) => window.open(getLogUrl(row), "_blank"),
    cellRight: (cell: Cell<EnrichedApiLog, unknown>) => {
      const meta = cell.column.columnDef.meta as
        | {
            filterParams?: (
              cell: Cell<EnrichedApiLog, unknown>,
            ) => Record<string, any> | undefined;
          }
        | undefined;

      if (!meta?.filterParams) return null;
      const params = meta.filterParams(cell);
      if (!params || Object.keys(params).length === 0) return null;
      return <FilterButtonTableRow set={params} />;
    },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `log${p ? "s" : ""}`,
    rowCount: logsCount || 0,
    loading: isLoading,
    error: error ? "Failed to load API logs" : undefined,
  });

  return (
    <div className="flex flex-col gap-3">
      <LogsFilters
        filters={filters}
        activeFilters={activeFilters}
        onSelect={onSelect}
        onRemove={onRemove}
        onRemoveAll={onRemoveAll}
        setSelectedFilter={setSelectedFilter}
        plan={plan || "free"}
      />
      {logs?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title={`No logs ${isFiltered ? "found" : "yet"}`}
          description={
            isFiltered
              ? "No logs found for the selected filters. Adjust your filters to refine your search results."
              : "No API logs have been recorded for your workspace yet."
          }
          cardContent={() => (
            <>
              <StackY3 className="text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}

function LogsFilters({
  filters,
  activeFilters,
  onSelect,
  onRemove,
  onRemoveAll,
  setSelectedFilter,
  plan,
}: {
  filters: any[];
  activeFilters: any[];
  onSelect: (key: string, value: any) => void;
  onRemove: (key: string) => void;
  onRemoveAll: () => void;
  setSelectedFilter: (f: string | null) => void;
  plan: PlanProps;
}) {
  const retentionDays = API_LOG_RETENTION_DAYS[plan];

  const presets =
    API_LOGS_PRESETS_BY_RETENTION[retentionDays] ??
    API_LOGS_PRESETS_BY_RETENTION[30];

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
            onSelectedFilterChange={setSelectedFilter}
          />
          <SimpleDateRangePicker
            className="w-full md:w-fit"
            align="start"
            defaultInterval="30d"
            presets={presets as any}
            fromDate={subDays(new Date(), retentionDays)}
          />
        </div>
        <SearchBoxPersisted
          urlParam="requestId"
          placeholder="Search by request ID"
          inputClassName="md:w-80"
        />
      </div>
      <AnimatedSizeContainer height>
        <div>
          {activeFilters.length > 0 && (
            <div className="pt-3">
              <Filter.List
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
                onRemoveAll={onRemoveAll}
              />
            </div>
          )}
        </div>
      </AnimatedSizeContainer>
    </div>
  );
}
