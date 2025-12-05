"use client";

import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { useFraudEventGroups } from "@/lib/swr/use-fraud-event-groups";
import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import { FraudEventGroupProps } from "@/lib/types";
import { FraudReviewSheet } from "@/ui/partners/fraud-risks/fraud-review-sheet";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
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
import { useEffect, useMemo, useState } from "react";
import { useFraudEventsFilters } from "../use-fraud-events-filters";

export function ResolvedFraudEventGroupsTable() {
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
  } = useFraudEventsFilters({
    status: "resolved",
  });

  const { fraudEvents, loading, error } = useFraudEventGroups({
    query: {
      status: "resolved",
    },
    exclude: ["groupKey"],
  });

  const [detailsSheetState, setDetailsSheetState] = useState<
    { open: false; groupKey: string | null } | { open: true; groupKey: string }
  >({ open: false, groupKey: null });

  useEffect(() => {
    const groupKey = searchParams.get("groupKey");

    if (groupKey) {
      setDetailsSheetState({ open: true, groupKey });
    } else {
      setDetailsSheetState({ open: false, groupKey: null });
    }
  }, [searchParams]);

  const { currentFraudEventGroup } = useCurrentFraudEventGroup({
    fraudEventGroups: fraudEvents,
    groupKey: detailsSheetState.groupKey,
  });

  const { fraudEventsCount, error: countError } = useFraudEventsCount<number>({
    query: {
      status: "resolved",
    },
  });

  const columns = useMemo(
    () => [
      {
        id: "type",
        header: "Event",
        minSize: 100,
        maxSize: 400,
        cell: ({ row }: { row: Row<FraudEventGroupProps> }) => {
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
                    className="shrink-0 rounded-md border-none px-1.5 py-1 text-xs font-semibold text-neutral-700"
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
        cell: ({ row }: { row: Row<FraudEventGroupProps> }) => {
          const user = row.original.user;
          const resolvedAt = row.original.resolvedAt;

          if (!resolvedAt || !user) return "-";

          return (
            <UserRowItem user={user} date={resolvedAt} label="Resolved at" />
          );
        },
      },
      {
        id: "partner",
        header: "Partner",
        cell: ({ row }: { row: Row<FraudEventGroupProps> }) => {
          const partner = row.original.partner;
          if (!partner) return "-";

          return (
            <PartnerRowItem
              partner={{
                id: partner.id,
                name: partner.name || "Unknown",
              }}
              showFraudIndicator={false}
            />
          );
        },
        meta: {
          filterParams: ({ row }: { row: Row<FraudEventGroupProps> }) =>
            row.original.partner
              ? {
                  partnerId: row.original.partner.id,
                }
              : {},
        },
      },
    ],
    [],
  );

  const { table, ...tableProps } = useTable({
    data: fraudEvents || [],
    columns,
    pagination,
    onPaginationChange: setPagination,
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
    onRowClick: (row) => {
      queryParams({
        set: {
          groupKey: row.original.groupKey,
        },
        scroll: false,
      });
    },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `resolved fraud event${plural ? "s" : ""}`,
    rowCount: fraudEventsCount ?? 0,
    loading,
    error:
      error || countError ? "Failed to load resolved fraud events" : undefined,
  });

  const [previousGroupKey, nextGroupKey] = useMemo(() => {
    if (!fraudEvents || !detailsSheetState.groupKey) return [null, null];

    const currentIndex = fraudEvents.findIndex(
      ({ groupKey }) => groupKey === detailsSheetState.groupKey,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? fraudEvents[currentIndex - 1].groupKey : null,
      currentIndex < fraudEvents.length - 1
        ? fraudEvents[currentIndex + 1].groupKey
        : null,
    ];
  }, [fraudEvents, detailsSheetState.groupKey]);

  return (
    <div className="flex flex-col gap-6">
      {detailsSheetState.groupKey && currentFraudEventGroup && (
        <FraudReviewSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          fraudEventGroup={currentFraudEventGroup}
          onPrevious={
            previousGroupKey
              ? () =>
                  queryParams({
                    set: { groupKey: previousGroupKey },
                    scroll: false,
                  })
              : undefined
          }
          onNext={
            nextGroupKey
              ? () =>
                  queryParams({
                    set: { groupKey: nextGroupKey },
                    scroll: false,
                  })
              : undefined
          }
        />
      )}
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

// Gets the current fraud event from the loaded array if available, or a separate fetch if not
function useCurrentFraudEventGroup({
  fraudEventGroups,
  groupKey,
}: {
  fraudEventGroups?: FraudEventGroupProps[];
  groupKey: string | null;
}) {
  let currentFraudEventGroup = groupKey
    ? fraudEventGroups?.find(
        (fraudEventGroup) => fraudEventGroup.groupKey === groupKey,
      )
    : null;

  const shouldFetch =
    fraudEventGroups && groupKey && !currentFraudEventGroup ? groupKey : null;

  const { fraudEvents: fetchedFraudEventGroups, loading: isLoading } =
    useFraudEventGroups({
      query: { groupKey: groupKey ?? undefined },
      enabled: Boolean(shouldFetch),
    });

  if (
    !currentFraudEventGroup &&
    fetchedFraudEventGroups?.[0]?.groupKey === groupKey
  ) {
    currentFraudEventGroup = fetchedFraudEventGroups[0];
  }

  return {
    currentFraudEventGroup,
    isLoading,
  };
}
