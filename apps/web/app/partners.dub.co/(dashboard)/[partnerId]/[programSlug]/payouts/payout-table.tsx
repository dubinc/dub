"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerPayoutResponse } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { PayoutTypeBadge } from "@/ui/partners/payout-type-badge";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { MoneyBill2 } from "@dub/ui/src/icons";
import { currencyFormatter, formatDate } from "@dub/utils";
import { fetcher } from "@dub/utils/src/functions/fetcher";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { PayoutDetailsSheet } from "./payout-details-sheet";

export function PayoutTable() {
  const { partnerId } = useParams();
  const { programEnrollment } = useProgramEnrollment();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  const sortBy = searchParams.get("sort") || "periodStart";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const {
    data: payouts,
    error,
    isLoading,
  } = useSWR<PartnerPayoutResponse[]>(
    programEnrollment &&
      `/api/partners/${partnerId}/programs/${programEnrollment.programId}/payouts?${getQueryString()}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; payout: PartnerPayoutResponse | null }
    | { open: true; payout: PartnerPayoutResponse }
  >({ open: false, payout: null });

  useEffect(() => {
    const payoutId = searchParams.get("payoutId");
    if (payoutId) {
      const payout = payouts?.find((p) => p.id === payoutId);
      if (payout) {
        setDetailsSheetState({ open: true, payout });
      }
    }
  }, [searchParams, payouts]);

  const { pagination, setPagination } = usePagination();

  const table = useTable({
    data: payouts || [],
    loading: isLoading,
    error: error ? "Failed to load payouts" : undefined,
    columns: [
      {
        id: "periodStart",
        header: "Period",
        accessorFn: (d) => {
          if (!d.periodStart || !d.periodEnd) {
            return "-";
          }

          return `${formatDate(d.periodStart, { month: "short", year: new Date(d.periodStart).getFullYear() === new Date(d.periodEnd).getFullYear() ? undefined : "numeric" })}-${formatDate(
            d.periodEnd,
            { month: "short" },
          )}`;
        },
      },
      {
        header: "Type",
        cell: ({ row }) => <PayoutTypeBadge type={row.original.type} />,
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
        id: "amount",
        header: "Amount",
        accessorFn: (d) =>
          currencyFormatter(d.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    sortBy,
    sortOrder: order,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sort: sortBy }),
          ...(sortOrder && { order: sortOrder }),
        },
      }),
    onRowClick: (row) => {
      queryParams({
        set: {
          payoutId: row.original.id,
        },
      });
    },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `payout${p ? "s" : ""}`,
    rowCount: payouts?.length || 0,
  });

  return (
    <>
      {detailsSheetState.payout && (
        <PayoutDetailsSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          payout={detailsSheetState.payout}
        />
      )}
      <div className="flex flex-col gap-3">
        {payouts?.length !== 0 ? (
          <Table {...table} />
        ) : (
          <AnimatedEmptyState
            title="No payouts found"
            description="No payouts have been initiated for this program yet."
            cardContent={() => (
              <>
                <MoneyBill2 className="size-4 text-neutral-700" />
                <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              </>
            )}
          />
        )}
      </div>
    </>
  );
}
