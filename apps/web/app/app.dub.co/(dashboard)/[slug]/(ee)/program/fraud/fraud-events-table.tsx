"use client";

import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import { useGroupedFraudEvents } from "@/lib/swr/use-grouped-fraud-events";
import { FraudEventProps } from "@/lib/types";
import { useBanPartnerModal } from "@/ui/modals/ban-partner-modal";
import { FraudReviewSheet } from "@/ui/partners/fraud-risks/fraud-review-sheet";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
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
import { Dots, ShieldKeyhole, UserDelete } from "@dub/ui/icons";
import { cn, currencyFormatter, formatDateTimeSmart } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";
import { useFraudEventsFilters } from "./use-fraud-events-filters";

export function FraudEventsTable() {
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
  } = useFraudEventsFilters();

  const {
    fraudEvents,
    loading,
    error,
  } = useGroupedFraudEvents({ query: { status: "pending" } });

  const [detailsSheetState, setDetailsSheetState] = useState<
    { open: false; groupKey: string | null } | { open: true; groupKey: string }
  >({ open: false, groupKey: null });

  useEffect(() => {
    const groupKey = searchParams.get("groupKey");
    if (groupKey) setDetailsSheetState({ open: true, groupKey });
  }, [searchParams]);

  const { currentFraudEvent } = useCurrentFraudEvent({
    fraudEvents,
    groupKey: detailsSheetState.groupKey,
  });

  const { fraudEventsCount, error: countError } = useFraudEventsCount<number>();

  const columns = useMemo(
    () => [
      {
        id: "type",
        header: "Event",
        size: 150,
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
        cell: ({ row }: { row: Row<FraudEventProps> }) => {
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
        cell: ({ row }: { row: Row<FraudEventProps> }) => (
          <TimestampTooltip
            timestamp={row.original.lastOccurenceAt}
            side="right"
            rows={["local", "utc", "unix"]}
            delayDuration={150}
          >
            <span>{formatDateTimeSmart(row.original.lastOccurenceAt)}</span>
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
        accessorFn: (d: FraudEventProps) =>
          d.commission?.earnings
            ? currencyFormatter(d.commission.earnings)
            : "-",
      },
      {
        id: "menu",
        minSize: 30,
        size: 30,
        maxSize: 30,
        cell: ({ row }: { row: Row<FraudEventProps> }) => (
          <RowMenuButton row={row} />
        ),
      },
    ],
    [],
  );

  const { table, ...tableProps } = useTable({
    data: fraudEvents || [],
    columns,
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
      {detailsSheetState.groupKey && currentFraudEvent && (
        <FraudReviewSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          fraudEvent={currentFraudEvent}
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
          title="No events to review"
          description="You'll see flagged fraud and risk events here when they happen."
          learnMoreHref="#"
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

function RowMenuButton({ row }: { row: Row<FraudEventProps> }) {
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

/** Gets the current fraud event from the loaded array if available, or a separate fetch if not */
function useCurrentFraudEvent({
  fraudEvents,
  groupKey,
}: {
  fraudEvents?: FraudEventProps[];
  groupKey: string | null;
}) {
  let currentFraudEvent = groupKey
    ? fraudEvents?.find(({ groupKey: gk }) => gk === groupKey)
    : null;

  const fetchGroupKey =
    fraudEvents && groupKey && !currentFraudEvent ? groupKey : null;

  const { fraudEvents: fetchedFraudEvents, loading: isLoading } =
    useGroupedFraudEvents({
      enabled: Boolean(groupKey),
      query: groupKey ? { groupKeys: [groupKey] } : undefined,
    });

  if (!currentFraudEvent && fetchedFraudEvents?.[0]?.groupKey === groupKey)
    currentFraudEvent = fetchedFraudEvents[0];

  return { currentFraudEvent, isLoading };
}
