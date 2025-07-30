"use client";

import { useFraudEvents } from "@/lib/swr/use-fraud-events";
import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, FraudEvent } from "@/lib/types";
import { FRAUD_EVENT_TYPES } from "@/lib/zod/schemas/fraud-events";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { FraudEventStatusBadges } from "@/ui/partners/fraud-event-status-badges";
import { useMarkFraudEventBannedModal } from "@/ui/partners/mark-fraud-event-banned-modal";
import { useMarkFraudEventSafeModal } from "@/ui/partners/mark-fraud-event-safe-modal";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { RiskReviewSheet } from "@/ui/partners/risk-review-sheet";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  AnimatedSizeContainer,
  Button,
  Filter,
  MenuItem,
  Popover,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Dots, Eye, Users } from "@dub/ui/icons";
import { currencyFormatter, formatDate } from "@dub/utils";
import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useColumnVisibility } from "../partners/use-column-visibility";
import { useFraudEventFilters } from "./use-fraud-event-filters";

export function FraudEventTable() {
  const { slug } = useWorkspace();
  const { pagination, setPagination } = usePagination();
  const { queryParams, searchParams } = useRouterStuff();
  const { columnVisibility, setColumnVisibility } = useColumnVisibility();

  const [detailsSheetState, setDetailsSheetState] = useState<{
    open: boolean;
    fraudEvent: FraudEvent | null;
  }>({ open: false, fraudEvent: null });

  const {
    fraudEventsCount,
    loading: fraudEventsCountLoading,
    error: fraudEventsCountError,
  } = useFraudEventsCount<number>();

  const {
    fraudEvents,
    loading: fraudEventsLoading,
    error: fraudEventsError,
  } = useFraudEvents();

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  } = useFraudEventFilters({});

  useEffect(() => {
    const fraudEventId = searchParams.get("fraudEventId");

    if (!fraudEvents || !fraudEventId) {
      setDetailsSheetState({ open: false, fraudEvent: null });
      return;
    }

    const fraudEvent = fraudEvents.find((f) => f.id === fraudEventId);

    if (fraudEvent) {
      setDetailsSheetState({ open: true, fraudEvent });
    }
  }, [searchParams, fraudEvents]);

  const { table, ...tableProps } = useTable({
    data: fraudEvents || [],
    columns: [
      {
        id: "flagged",
        header: "Flagged",
        accessorFn: (d: FraudEvent) =>
          formatDate(d.createdAt, { month: "short" }),
      },
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => {
          return row.original.customer ? (
            <CustomerRowItem
              customer={row.original.customer}
              href={`/${slug}/customers/${row.original.customer.id}`}
            />
          ) : (
            "-"
          );
        },
      },
      {
        id: "partner",
        header: "Partner",
        cell: ({ row }) => {
          return (
            <PartnerRowItem
              partner={row.original.partner}
              showPayoutsEnabled={false}
            />
          );
        },
        meta: {
          filterParams: ({ row }) => ({
            partnerId: row.original.partner.id,
          }),
        },
      },
      {
        id: "reason",
        header: "Reason",
        cell: ({ row }) => FRAUD_EVENT_TYPES[row.original.type].label,
        meta: {
          filterParams: ({ row }) => ({
            type: row.original.type,
          }),
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const badge = FraudEventStatusBadges[row.original.status];

          return badge ? (
            <StatusBadge icon={null} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          ) : (
            "-"
          );
        },
        meta: {
          filterParams: ({ row }) => ({
            status: row.original.status,
          }),
        },
      },
      {
        id: "holdAmount",
        header: "Hold amount",
        accessorFn: (d) =>
          d.holdAmount
            ? currencyFormatter(d.holdAmount / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
      },
      {
        id: "menu",
        minSize: 40,
        size: 40,
        maxSize: 40,
        cell: ({ row }) => <RowMenuButton fraudEvent={row.original} />,
      },
    ],
    onRowClick: (row) => {
      queryParams({
        set: {
          fraudEventId: row.original.id,
        },
        scroll: false,
      });
    },
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
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `fraud event${p ? "s" : ""}`,
    rowCount: fraudEventsCount || 0,
    loading: fraudEventsCountLoading || fraudEventsLoading,
    error:
      fraudEventsCountError || fraudEventsError
        ? "Failed to load fraud events"
        : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      {detailsSheetState.fraudEvent && (
        <RiskReviewSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open: boolean) =>
            setDetailsSheetState((s) => ({ ...s, open }))
          }
          fraudEvent={detailsSheetState.fraudEvent}
        />
      )}

      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          <SimpleDateRangePicker
            className="w-full sm:min-w-[200px] md:w-fit"
            defaultInterval="all"
          />
        </div>

        <AnimatedSizeContainer height>
          <div>
            {activeFilters.length > 0 && (
              <div className="pt-3">
                <Filter.List
                  filters={filters}
                  activeFilters={activeFilters}
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
          title="No fraud events found"
          description={
            isFiltered
              ? "No fraud events found for the selected filters."
              : "No fraud events have been flagged for this program yet."
          }
          cardContent={() => (
            <>
              <Users className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}

function RowMenuButton({ fraudEvent }: { fraudEvent: FraudEvent }) {
  const { queryParams, searchParams } = useRouterStuff();
  const [isOpen, setIsOpen] = useState(false);

  const {
    MarkFraudEventSafeModal,
    setShowModal: setShowMarkFraudEventSafeModal,
  } = useMarkFraudEventSafeModal({
    fraudEvent,
  });

  const {
    MarkFraudEventBannedModal,
    setShowModal: setShowMarkFraudEventBannedModal,
  } = useMarkFraudEventBannedModal({
    fraudEvent,
  });

  const SafeIcon = FraudEventStatusBadges["safe"].icon;
  const BanIcon = FraudEventStatusBadges["banned"].icon;

  return (
    <>
      <MarkFraudEventSafeModal />
      <MarkFraudEventBannedModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              <MenuItem
                as={Command.Item}
                icon={Eye}
                onSelect={() => {
                  setIsOpen(false);
                  queryParams({
                    set: {
                      fraudEventId: fraudEvent.id,
                    },
                    scroll: false,
                  });
                }}
              >
                View risk
              </MenuItem>

              {["pending", "safe"].includes(fraudEvent.status) && (
                <MenuItem
                  as={Command.Item}
                  icon={<BanIcon className="text-red-600" />}
                  onSelect={() => {
                    setIsOpen(false);
                    setShowMarkFraudEventBannedModal(true);
                  }}
                >
                  Ban partner
                </MenuItem>
              )}

              {["pending", "banned"].includes(fraudEvent.status) && (
                <MenuItem
                  as={Command.Item}
                  icon={<SafeIcon className="text-green-600" />}
                  onSelect={() => {
                    setIsOpen(false);
                    setShowMarkFraudEventSafeModal(true);
                  }}
                >
                  Mark partner as safe
                </MenuItem>
              )}
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

/** Gets the current partner from the loaded partners array if available, or a separate fetch if not */
// TODO:
// Fix this
function useCurrentPartner({
  partners,
  partnerId,
}: {
  partners?: EnrolledPartnerProps[];
  partnerId: string | null;
}) {
  let currentPartner = partnerId
    ? partners?.find(({ id }) => id === partnerId)
    : null;

  const { partner: fetchedPartner, loading: isLoading } = usePartner(
    {
      partnerId: partners && partnerId && !currentPartner ? partnerId : null,
    },
    {
      keepPreviousData: true,
    },
  );

  if (!currentPartner && fetchedPartner?.id === partnerId) {
    currentPartner = fetchedPartner;
  }

  return { currentPartner, isLoading };
}
