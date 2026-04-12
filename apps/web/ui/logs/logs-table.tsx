"use client";

import {
  API_LOGS_MAX_PAGE_SIZE,
  METHOD_BADGE_VARIANTS,
  WEBHOOK_DISPLAY_NAMES,
} from "@/lib/api-logs/constants";
import { useApiLogsCount } from "@/lib/swr/use-api-logs-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrichedApiLog } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { UserAvatar } from "@/ui/users/user-avatar";
import {
  AnimatedSizeContainer,
  Filter,
  StatusBadge,
  Table,
  TimestampTooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { StackY3 } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import { Cell, Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { getStatusCodeBadgeVariant } from "./log-utils";
import { useLogFilters } from "./use-log-filters";

export function LogsTable() {
  const router = useRouter();
  const { id: workspaceId, slug } = useWorkspace();
  const { searchParamsObj } = useRouterStuff();

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    setSearch,
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

  const { data: logsCount } = useApiLogsCount<number>();

  const isFiltered = activeFilters.length > 0;

  const columns = useMemo(
    () => [
      {
        id: "path",
        header: "Endpoint",
        cell: ({ row }: { row: Row<EnrichedApiLog> }) => {
          const displayName = WEBHOOK_DISPLAY_NAMES[row.original.path];

          return (
            <span
              className="truncate"
              title={row.original.route_pattern || undefined}
            >
              {displayName || row.original.path}
            </span>
          );
        },
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
          const { token, user } = row.original;

          if (token) {
            return (
              <span className="truncate font-mono text-xs text-neutral-500">
                {token.partialKey}
              </span>
            );
          }

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
            rows={["local"]}
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
    ],
    [],
  );

  const getLogUrl = (row: Row<EnrichedApiLog>) =>
    `/${slug}/settings/logs/${row.original.id}`;

  const { table, ...tableProps } = useTable({
    data: logs || [],
    columns,
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
            ) => Record<string, any>;
          }
        | undefined;

      return (
        meta?.filterParams && (
          <FilterButtonTableRow set={meta.filterParams(cell)} />
        )
      );
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
        setSearch={setSearch}
        setSelectedFilter={setSelectedFilter}
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
  setSearch,
  setSelectedFilter,
}: {
  filters: any[];
  activeFilters: any[];
  onSelect: (key: string, value: any) => void;
  onRemove: (key: string) => void;
  onRemoveAll: () => void;
  setSearch: (s: string) => void;
  setSelectedFilter: (f: string | null) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Filter.Select
          className="w-full md:w-fit"
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
          onSearchChange={setSearch}
          onSelectedFilterChange={setSelectedFilter}
        />
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
