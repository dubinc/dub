"use client";

import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { useFraudEventGroups } from "@/lib/swr/use-fraud-event-groups";
import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import { fraudEventGroupProps } from "@/lib/types";
import { useBanPartnerModal } from "@/ui/modals/ban-partner-modal";
import { FraudReviewSheet } from "@/ui/partners/fraud-risks/fraud-review-sheet";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import {
  AnimatedSizeContainer,
  Badge,
  Button,
  Filter,
  Icon,
  Popover,
  Table,
  TimestampTooltip,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Dots, UserDelete } from "@dub/ui/icons";
import { cn, currencyFormatter, formatDateTimeSmart } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";
import { FraudEventsEmptyState } from "./fraud-events-empty-state";
import { useFraudEventsFilters } from "./use-fraud-events-filters";

export function FraudEventGroupsTable() {
  const { queryParams, searchParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination();

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    setSearch,
    setSelectedFilter,
  } = useFraudEventsFilters({
    status: "pending",
  });

  const { fraudEvents, loading, error } = useFraudEventGroups({
    query: {
      status: "pending",
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
      status: "pending",
    },
  });

  const { table, ...tableProps } = useTable<fraudEventGroupProps>({
    data: fraudEvents || [],
    columns: [
      {
        id: "type",
        header: "Event",
        size: 150,
        cell: ({ row }) => {
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
        id: "partner",
        header: "Partner",
        size: 150,
        cell: ({ row }) => {
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
          filterParams: ({ row }) =>
            row.original.partner
              ? {
                  partnerId: row.original.partner.id,
                }
              : {},
        },
      },
      {
        id: "createdAt",
        header: "Last Detected",
        size: 150,
        meta: {
          headerTooltip:
            "The date and time of the most recent occurrence of this fraud event.",
        },
        cell: ({ row }) => (
          <TimestampTooltip
            timestamp={row.original.lastOccurrenceAt}
            side="right"
            rows={["local", "utc", "unix"]}
            delayDuration={150}
          >
            <span>{formatDateTimeSmart(row.original.lastOccurrenceAt)}</span>
          </TimestampTooltip>
        ),
      },
      {
        id: "amount",
        header: "Hold Amount",
        size: 100,
        meta: {
          headerTooltip:
            "The commissions accrued since the event and cannot be paid out until resolved.",
        },
        accessorFn: (d) => {
          const earnings = d.commission?.earnings;
          return earnings === null || earnings === undefined
            ? "-"
            : currencyFormatter(earnings);
        },
      },
      {
        id: "menu",
        minSize: 30,
        size: 30,
        maxSize: 30,
        cell: ({ row }) => <RowMenuButton row={row} />,
      },
    ],
    columnPinning: { right: ["menu"] },
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
    sortableColumns: ["createdAt", "type"],
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
    resourceName: (plural) => `event${plural ? "s" : ""}`,
    rowCount: fraudEventsCount ?? 0,
    loading,
    error: error || countError ? "Failed to load fraud events" : undefined,
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

      {((fraudEvents?.length ?? 0) > 0 || (fraudEventsCount ?? 0) > 0) && (
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
      )}
      {fraudEvents?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <FraudEventsEmptyState />
      )}
    </div>
  );
}

function RowMenuButton({ row }: { row: Row<fraudEventGroupProps> }) {
  const fraudEvent = row.original;

  const [isOpen, setIsOpen] = useState(false);

  const { BanPartnerModal, setShowBanPartnerModal } = useBanPartnerModal({
    partner: fraudEvent.partner,
  });

  if (fraudEvent.status !== "pending") {
    return null;
  }

  return (
    <>
      <BanPartnerModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="w-screen text-sm focus-visible:outline-none sm:w-auto sm:min-w-[160px]">
              <Command.Group className="grid gap-px p-1.5">
                <MenuItem
                  icon={UserDelete}
                  label="Ban partner"
                  variant="danger"
                  onSelect={() => {
                    setShowBanPartnerModal(true);
                    setIsOpen(false);
                  }}
                />
              </Command.Group>
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="h-8 whitespace-nowrap px-2"
          variant="outline"
          icon={<Dots className="h-4 w-4 shrink-0" />}
        />
      </Popover>
    </>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  variant = "default",
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  variant?: "default" | "danger";
}) {
  const variantStyles = {
    default: {
      text: "text-neutral-600",
      icon: "text-neutral-500",
    },
    danger: {
      text: "text-red-600",
      icon: "text-red-600",
    },
  };

  const { text, icon } = variantStyles[variant];

  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm",
        "data-[selected=true]:bg-neutral-100",
        text,
      )}
      onSelect={onSelect}
    >
      <IconComp className={cn("size-4 shrink-0", icon)} />
      {label}
    </Command.Item>
  );
}

// Gets the current fraud event from the loaded array if available, or a separate fetch if not
function useCurrentFraudEventGroup({
  fraudEventGroups,
  groupKey,
}: {
  fraudEventGroups?: fraudEventGroupProps[];
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
