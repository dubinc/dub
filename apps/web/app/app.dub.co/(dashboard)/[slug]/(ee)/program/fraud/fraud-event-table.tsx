"use client";

import { useFraudEvents } from "@/lib/swr/use-fraud-events";
import { useFraudEventsCount } from "@/lib/swr/use-fraud-events-count";
import usePartner from "@/lib/swr/use-partner";
import { EnrolledPartnerProps, FraudEvent } from "@/lib/types";
import { FRAUD_EVENT_TYPE_DESCRIPTIONS } from "@/lib/zod/schemas/fraud-events";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { FraudEventStatusBadges } from "@/ui/partners/fraud-event-status-badges";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { RiskReviewSheet } from "@/ui/partners/risk-review-sheet";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  AnimatedSizeContainer,
  Filter,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Users } from "@dub/ui/icons";
import { currencyFormatter, formatDate } from "@dub/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useColumnVisibility } from "../partners/use-column-visibility";
import { usePartnerFilters } from "../partners/use-partner-filters";

export function FraudEventTable() {
  const { slug } = useParams();
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
  } = usePartnerFilters({});

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
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 200,
        size: 200,
        cell: ({ row }) => {
          return (
            <PartnerRowItem
              partner={row.original.partner}
              showPayoutsEnabled={false}
            />
          );
        },
      },
      {
        id: "customer",
        header: "Customer",
        enableHiding: false,
        minSize: 150,
        size: 150,
        cell: ({ row }) => {
          return row.original.customer ? (
            <CustomerRowItem
              customer={row.original.customer}
              avatarClassName="size-5"
              href={`/${slug}/customers/${row.original.customer.id}`}
            />
          ) : (
            "-"
          );
        },
      },
      {
        id: "flagged",
        header: "Flagged",
        minSize: 120,
        size: 120,
        accessorFn: (d: FraudEvent) =>
          formatDate(d.createdAt, { month: "short" }),
      },
      {
        id: "status",
        header: "Status",
        minSize: 100,
        size: 100,
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
      },
      {
        id: "reason",
        header: "Reason",
        minSize: 200,
        size: 200,
        cell: ({ row }) => FRAUD_EVENT_TYPE_DESCRIPTIONS[row.original.type],
      },
      {
        id: "holdAmount",
        header: "Hold amount",
        minSize: 120,
        size: 120,
        accessorFn: (d) =>
          d.holdAmount
            ? currencyFormatter(d.holdAmount / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          {/* <SearchBoxPersisted
            placeholder="Search by name, email, or link"
            inputClassName="md:w-72"
          /> */}
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
