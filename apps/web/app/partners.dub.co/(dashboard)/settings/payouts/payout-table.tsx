"use client";

import usePartnerPayouts from "@/lib/swr/use-partner-payouts";
import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerPayoutResponse } from "@/lib/types";
import { AmountRowItem } from "@/ui/partners/amount-row-item";
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
import { MoneyBill2 } from "@dub/ui/icons";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { formatPeriod } from "@dub/utils/src/functions/datetime";
import { useEffect, useState } from "react";
import { PayoutDetailsSheet } from "./payout-details-sheet";

export function PayoutTable() {
  const { partner } = usePartnerProfile();
  const { queryParams, searchParams } = useRouterStuff();

  const sortBy = searchParams.get("sortBy") || "periodStart";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const { payouts, error, loading } = usePartnerPayouts();
  const { payoutsCount } = usePartnerPayoutsCount<number>();

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
    loading,
    error: error ? "Failed to load payouts" : undefined,
    columns: [
      {
        id: "periodStart",
        header: "Period",
        accessorFn: (d) => formatPeriod(d),
      },
      {
        header: "Program",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={
                row.original.program.logo ||
                `${DICEBEAR_AVATAR_URL}${row.original.program.name}`
              }
              alt={row.original.program.name}
              className="size-4 rounded-sm"
            />
            <span>{row.original.program.name}</span>
          </div>
        ),
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
        cell: ({ row }) => (
          <AmountRowItem
            amount={row.original.amount}
            status={row.original.status}
            payoutsEnabled={Boolean(partner?.payoutsEnabledAt)}
            minPayoutAmount={row.original.program.minPayoutAmount}
          />
        ),
      },
    ],
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
    rowCount: payoutsCount,
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
