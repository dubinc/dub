"use client";

import { PayoutCounts, PayoutWithPartnerProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Filter,
  MoneyBill2,
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
} from "@dub/ui/src/icons";
import { currencyFormatter, DICEBEAR_AVATAR_URL, formatDate } from "@dub/utils";
import { fetcher } from "@dub/utils/src/functions/fetcher";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { usePayoutFilters } from "./use-payout-filters";

export const StatusBadges = {
  created: {
    label: "Created",
    variant: "new",
    icon: CircleHalfDottedCheck,
    className: "text-blue-600",
  },
  pending: {
    label: "Pending",
    variant: "pending",
    icon: CircleHalfDottedClock,
    className: "text-orange-600",
  },
  failed: {
    label: "Failed",
    variant: "error",
    icon: CircleWarning,
    className: "text-red-600",
  },
  completed: {
    label: "Paid",
    variant: "success",
    icon: CircleCheck,
    className: "text-green-600",
  },
  reversed: {
    label: "Reversed",
    variant: "error",
    icon: CircleHalfDottedClock,
    className: "text-red-600",
  },
  canceled: {
    label: "Canceled",
    variant: "error",
    icon: CircleXmark,
    className: "text-red-600",
  },
  flagged: {
    label: "Flagged",
    variant: "warning",
    icon: CircleWarning,
    className: "text-yellow-600",
  },
};

export function PayoutTable({ programId }: { programId: string }) {
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

  const loading = !payouts && !error;

  // Whether the initial tags have already loaded, for some loading states like the search box
  const [initiallyLoaded, setInitiallyLoaded] = useState(false);
  useEffect(() => {
    if (!loading && payouts) setInitiallyLoaded(true);
  }, [payouts, loading]);

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
          const badge = StatusBadges[row.original.status];
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
        id: "total",
        header: "Total",
        accessorFn: (d) =>
          currencyFormatter(d.total / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
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
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `payout${p ? "s" : ""}`,
    rowCount: totalPayoutsCount,
    loading,
    error: error || countError ? "Failed to load payouts" : undefined,
  });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {loading && !initiallyLoaded ? (
            <>
              <div className="h-10 w-full animate-pulse rounded-md bg-neutral-200 md:w-24" />
              <div className="h-10 w-full animate-pulse rounded-md bg-neutral-200 md:w-32" />
            </>
          ) : (
            <>
              <Filter.Select
                className="w-full md:w-fit"
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
              />
              <SearchBoxPersisted />
            </>
          )}
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
