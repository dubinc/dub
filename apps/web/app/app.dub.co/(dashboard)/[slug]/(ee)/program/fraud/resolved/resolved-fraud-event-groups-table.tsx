"use client";

import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { useFraudEventGroups } from "@/lib/swr/use-fraud-event-groups";
import { useFraudGroupCount } from "@/lib/swr/use-fraud-groups-count";
import { fraudEventGroupProps } from "@/lib/types";
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
import { useFraudGroupFilters } from "../use-fraud-group-filters";

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
  } = useFraudGroupFilters({
    status: "resolved",
  });

  const { fraudEventGroups, loading, error } = useFraudEventGroups({
    query: {
      status: "resolved",
    },
    exclude: ["groupId"],
  });

  const [detailsSheetState, setDetailsSheetState] = useState<
    { open: false; groupId: string | null } | { open: true; groupId: string }
  >({ open: false, groupId: null });

  useEffect(() => {
    const groupId = searchParams.get("groupId");

    if (groupId) {
      setDetailsSheetState({ open: true, groupId });
    } else {
      setDetailsSheetState({ open: false, groupId: null });
    }
  }, [searchParams]);

  const { currentFraudEventGroup } = useCurrentFraudEventGroup({
    fraudEventGroups,
    groupId: detailsSheetState.groupId,
  });

  const { fraudGroupCount, error: countError } = useFraudGroupCount<number>({
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
        cell: ({ row }: { row: Row<fraudEventGroupProps> }) => {
          const reason = FRAUD_RULES_BY_TYPE[row.original.type];
          const count = row.original.eventCount ?? 1;

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
        cell: ({ row }: { row: Row<fraudEventGroupProps> }) => {
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
        cell: ({ row }: { row: Row<fraudEventGroupProps> }) => {
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
          filterParams: ({ row }: { row: Row<fraudEventGroupProps> }) =>
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
    data: fraudEventGroups || [],
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
          groupId: row.original.id,
        },
        scroll: false,
      });
    },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `resolved fraud event${plural ? "s" : ""}`,
    rowCount: fraudGroupCount ?? 0,
    loading,
    error:
      error || countError ? "Failed to load resolved fraud events" : undefined,
  });

  const [previousGroupId, nextGroupId] = useMemo(() => {
    if (!fraudEventGroups || !detailsSheetState.groupId) return [null, null];

    const currentIndex = fraudEventGroups.findIndex(
      ({ id }) => id === detailsSheetState.groupId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? fraudEventGroups[currentIndex - 1].id : null,
      currentIndex < fraudEventGroups.length - 1
        ? fraudEventGroups[currentIndex + 1].id
        : null,
    ];
  }, [fraudEventGroups, detailsSheetState.groupId]);

  return (
    <div className="flex flex-col gap-6">
      {detailsSheetState.groupId && currentFraudEventGroup && (
        <FraudReviewSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          fraudEventGroup={currentFraudEventGroup}
          onPrevious={
            previousGroupId
              ? () =>
                  queryParams({
                    set: { groupId: previousGroupId },
                    scroll: false,
                  })
              : undefined
          }
          onNext={
            nextGroupId
              ? () =>
                  queryParams({
                    set: { groupId: nextGroupId },
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

      {fraudEventGroups?.length !== 0 ? (
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
  groupId,
}: {
  fraudEventGroups?: fraudEventGroupProps[];
  groupId: string | null;
}) {
  let currentFraudEventGroup = groupId
    ? fraudEventGroups?.find(
        (fraudEventGroup) => fraudEventGroup.id === groupId,
      )
    : null;

  const shouldFetch =
    fraudEventGroups && groupId && !currentFraudEventGroup ? groupId : null;

  const { fraudEventGroups: fetchedFraudEventGroups, loading: isLoading } =
    useFraudEventGroups({
      query: { groupId: groupId ?? undefined },
      enabled: Boolean(shouldFetch),
    });

  if (!currentFraudEventGroup && fetchedFraudEventGroups?.[0]?.id === groupId) {
    currentFraudEventGroup = fetchedFraudEventGroups[0];
  }

  return {
    currentFraudEventGroup,
    isLoading,
  };
}
