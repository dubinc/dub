"use client";

import { PayoutCounts, PayoutWithPartnerProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Button,
  Filter,
  Icon,
  MoneyBill2,
  Popover,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  CircleCheck,
  CircleHalfDottedCheck,
  CircleHalfDottedClock,
  CircleWarning,
  CircleXmark,
  Dots,
  GreekTemple,
  ScanText,
  Users,
} from "@dub/ui/src/icons";
import {
  cn,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  formatDate,
} from "@dub/utils";
import { fetcher } from "@dub/utils/src/functions/fetcher";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { usePayoutConfirmSheet } from "./payout-confirm-sheet";
import { usePayoutDetailsSheet } from "./payout-details-sheet";
import { usePayoutFilters } from "./use-payout-filters";

export const PayoutStatusBadges = {
  created: {
    label: "Created",
    variant: "new",
    icon: CircleHalfDottedCheck,
    className: "text-blue-600 bg-blue-100",
  },
  pending: {
    label: "Pending",
    variant: "pending",
    icon: CircleHalfDottedClock,
    className: "text-orange-600 bg-orange-100",
  },
  failed: {
    label: "Failed",
    variant: "error",
    icon: CircleWarning,
    className: "text-red-600 bg-red-100",
  },
  completed: {
    label: "Paid",
    variant: "success",
    icon: CircleCheck,
    className: "text-green-600 bg-green-100",
  },
  reversed: {
    label: "Reversed",
    variant: "error",
    icon: CircleHalfDottedClock,
    className: "text-red-600 bg-red-100",
  },
  canceled: {
    label: "Canceled",
    variant: "error",
    icon: CircleXmark,
    className: "text-red-600 bg-red-100",
  },
  flagged: {
    label: "Flagged",
    variant: "warning",
    icon: CircleWarning,
    className: "text-yellow-600 bg-yellow-100",
  },
};

export function PayoutTable() {
  const { programId } = useParams();
  const { queryParams, searchParams } = useRouterStuff();

  const sortBy = searchParams.get("sort") || "periodStart";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    isFiltered,
  } = usePayoutFilters({ sortBy, order });

  const { data: payoutCounts, error: countError } = useSWR<PayoutCounts[]>(
    `/api/programs/${programId}/payouts/count?${searchQuery}`,
    fetcher,
  );

  const totalPayoutsCount = useMemo(
    () => payoutCounts?.reduce((acc, { _count }) => acc + _count, 0) || 0,
    [payoutCounts],
  );

  const { data: payouts, error } = useSWR<PayoutWithPartnerProps[]>(
    `/api/programs/${programId}/payouts?${searchQuery}`,
    fetcher,
  );

  const { pagination, setPagination } = usePagination();

  const table = useTable({
    data: payouts || [],
    columns: [
      {
        id: "periodStart",
        header: "Period",
        accessorFn: (d) =>
          `${formatDate(d.periodStart, { month: "short", year: new Date(d.periodStart).getFullYear() === new Date(d.periodEnd).getFullYear() ? undefined : "numeric" })}-${formatDate(
            d.periodEnd,
            { month: "short" },
          )}`,
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const badge = PayoutStatusBadges[row.original.status];
          return badge ? (
            <StatusBadge icon={badge.icon} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          ) : (
            "-"
          );
        },
      },
      {
        header: "Partner",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <img
                src={
                  row.original.partner.logo ||
                  `${DICEBEAR_AVATAR_URL}${row.original.partner.name}`
                }
                alt={row.original.partner.name}
                className="size-5 rounded-full"
              />
              <div>{row.original.partner.name}</div>
            </div>
          );
        },
      },
      {
        header: "Conversions",
        accessorFn: () => "-", // TODO: [payouts] Add conversions counts to /api/programs/[programId]/payouts response
      },
      {
        id: "total",
        header: "Total",
        accessorFn: (d) =>
          currencyFormatter(d.total / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      // Menu
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        cell: ({ row }) => <RowMenuButton row={row} />,
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["periodStart", "total"],
    sortBy,
    sortOrder: order,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sort: sortBy }),
          ...(sortOrder && { order: sortOrder }),
        },
      }),
    columnPinning: { right: ["menu"] },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `payout${p ? "s" : ""}`,
    rowCount: totalPayoutsCount,
    loading: !payouts && !error,
    error: error || countError ? "Failed to load payouts" : undefined,
  });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          <SearchBoxPersisted />
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
      {payouts?.length !== 0 ? (
        <Table {...table} />
      ) : (
        <AnimatedEmptyState
          title="No payouts found"
          description={
            isFiltered
              ? "No payouts found for the selected filters."
              : "No payouts have been initiated for this program yet."
          }
          cardContent={() => (
            <>
              <MoneyBill2 className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}

function RowMenuButton({ row }: { row: Row<PayoutWithPartnerProps> }) {
  const [isOpen, setIsOpen] = useState(false);

  const canConfirmPayout = ["created", "pending", "flagged", "failed"].includes(
    row.original.status,
  );

  const { payoutConfirmSheet, setIsOpen: setShowPayoutConfirmSheet } =
    usePayoutConfirmSheet({
      payout: row.original,
    });

  const { payoutDetailsSheet, setIsOpen: setShowPayoutDetailsSheet } =
    usePayoutDetailsSheet({
      payout: row.original,
      onConfirmPayout: canConfirmPayout
        ? () => setShowPayoutConfirmSheet(true)
        : undefined,
    });

  return (
    <>
      {payoutDetailsSheet}
      {canConfirmPayout && payoutConfirmSheet}
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[130px]">
              {canConfirmPayout && (
                <MenuItem
                  icon={GreekTemple}
                  label="Pay invoice"
                  onSelect={() => {
                    setShowPayoutConfirmSheet(true);
                    setIsOpen(false);
                  }}
                />
              )}
              <MenuItem
                icon={ScanText}
                label="Review"
                onSelect={() => {
                  setShowPayoutDetailsSheet(true);
                  setIsOpen(false);
                }}
              />
              <MenuItem
                icon={Users}
                label="View partner"
                onSelect={() => {
                  toast.info("WIP"); // TODO
                  setIsOpen(false);
                }}
              />
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
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
        "data-[selected=true]:bg-gray-100",
      )}
      onSelect={onSelect}
    >
      <IconComp className="size-4 shrink-0 text-neutral-500" />
      {label}
    </Command.Item>
  );
}
