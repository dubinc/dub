"use client";

import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { useGroupedFraudEvents } from "@/lib/swr/use-grouped-fraud-events";
import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import { FraudEventProps } from "@/lib/types";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import { UserRowItem } from "@/ui/users/user-row-item";
import {
  AnimatedSizeContainer,
  Badge,
  Filter,
  Table,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { ShieldKeyhole } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { useMemo } from "react";
import { useFraudEventsFilters } from "../use-fraud-events-filters";

export function ResolvedFraudEventsTable() {
  const { queryParams, searchParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination();

  const sortBy = searchParams.get("sortBy") || "resolvedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
    setSearch,
    setSelectedFilter,
  } = useFraudEventsFilters();

  const {
    fraudEvents,
    loading: isLoading,
    error,
  } = useGroupedFraudEvents({ query: { status: "resolved" } });

  const { fraudEventsCount, error: countError } = useFraudEventsCount<number>({
    status: "resolved",
  });

  const columns = useMemo(
    () => [
      {
        id: "partner",
        header: "Partner",
        size: 150,
        cell: ({ row }: { row: Row<FraudEventProps> }) => {
          const partner = row.original.partner;
          if (!partner) return "-";

          return (
            <PartnerRowItem
              partner={{
                id: partner.id,
                name: partner.name || "Unknown",
              }}
              showFraudFlag={false}
            />
          );
        },
        meta: {
          filterParams: ({ row }: { row: Row<FraudEventProps> }) =>
            row.original.partner
              ? {
                  partnerId: row.original.partner.id,
                }
              : {},
        },
      },
      {
        id: "type",
        header: "Reason",
        size: 200,
        cell: ({ row }: { row: Row<FraudEventProps> }) => {
          const reason = FRAUD_RULES_BY_TYPE[row.original.type];
          const count = row.original.count ?? 1;

          if (reason) {
            return (
              <div className="flex items-center gap-2">
                <Tooltip content={reason.description}>
                  <span
                    className={cn(
                      "cursor-help truncate underline decoration-dotted underline-offset-2",
                    )}
                  >
                    {reason.name}
                  </span>
                </Tooltip>

                {count > 1 && (
                  <Badge
                    variant="gray"
                    className="shrink-0 rounded-md border-none px-1.5 py-0.5 text-xs font-semibold text-neutral-700"
                  >
                    +{Number(count) - 1}
                  </Badge>
                )}
              </div>
            );
          }
        },
        meta: {
          filterParams: ({ row }) => ({
            type: row.original.type,
          }),
        },
      },
      {
        id: "resolvedAt",
        header: "Resolved on",
        size: 150,
        cell: ({ row }: { row: Row<FraudEventProps> }) => {
          const user = row.original.user;
          const resolvedAt = row.original.resolvedAt;

          if (!resolvedAt) return "-";

          if (!user) return "-";

          return (
            <UserRowItem user={user} date={resolvedAt} label="Resolved at" />
          );
        },
      },
    ],
    [],
  );

  const { table, ...tableProps } = useTable({
    data: fraudEvents || [],
    columns,
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as
        | {
            filterParams?: any;
          }
        | undefined;

      return (
        meta?.filterParams && (
          <FilterButtonTableRow set={meta.filterParams(cell)} />
        )
      );
    },
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["resolvedAt", "type"],
    sortBy,
    sortOrder,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
        del: "page",
        scroll: false,
      }),
    getRowId: (row) => row.id,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: () => "fraud event",
    rowCount: fraudEventsCount ?? 0,
    loading: isLoading,
    error: error || countError ? "Failed to load fraud events" : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
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
      {fraudEvents?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No resolved fraud events found"
          description={
            isFiltered
              ? "No resolved fraud events found for the selected filters."
              : "No fraud events have been resolved yet."
          }
          cardContent={() => (
            <>
              <ShieldKeyhole className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}
