"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
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
import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { ApiLog, getStatusCodeBadgeVariant } from "./log-utils";
import { useLogFilters } from "./use-log-filters";

export function LogsTable() {
  const { id: workspaceId, slug } = useWorkspace();
  const router = useRouter();
  const { getQueryString } = useRouterStuff();

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

  const {
    data: logs,
    error,
    isLoading,
  } = useSWR<ApiLog[]>(workspaceId && `/api/api-logs?${searchQuery}`, fetcher, {
    keepPreviousData: true,
  });

  const { data: logsCount } = useSWR<number>(
    workspaceId && `/api/api-logs/count?${searchQuery}`,
    fetcher,
  );

  const { pagination, setPagination } = usePagination();

  const isFiltered = activeFilters.length > 0;

  const columns = useMemo(
    () => [
      {
        id: "path",
        header: "Endpoint",
        cell: ({ row }: { row: Row<ApiLog> }) => (
          <span className="truncate font-mono text-xs">
            {row.original.path}
          </span>
        ),
        size: 300,
      },
      {
        id: "method",
        header: "Method",
        cell: ({ row }: { row: Row<ApiLog> }) => (
          <StatusBadge variant="new" icon={null}>
            {row.original.method}
          </StatusBadge>
        ),
        size: 100,
      },
      {
        id: "status_code",
        header: "Status",
        cell: ({ row }: { row: Row<ApiLog> }) => (
          <StatusBadge
            variant={getStatusCodeBadgeVariant(row.original.status_code)}
            icon={null}
          >
            {row.original.status_code}
          </StatusBadge>
        ),
        size: 100,
      },
      {
        id: "actor",
        header: "Actor",
        cell: ({ row }: { row: Row<ApiLog> }) => {
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
        cell: ({ row }: { row: Row<ApiLog> }) => (
          <span className="text-sm text-neutral-500">
            {row.original.duration}ms
          </span>
        ),
        size: 100,
      },
      {
        id: "timestamp",
        header: "Time",
        cell: ({ row }: { row: Row<ApiLog> }) => (
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

  const getLogUrl = (row: Row<ApiLog>) =>
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
      <Filter.Select
        className="w-full md:w-fit"
        filters={filters}
        activeFilters={activeFilters}
        onSelect={onSelect}
        onRemove={onRemove}
        onSearchChange={setSearch}
        onSelectedFilterChange={setSelectedFilter}
      />
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
