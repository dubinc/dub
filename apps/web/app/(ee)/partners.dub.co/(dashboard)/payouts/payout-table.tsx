"use client";

import usePartnerPayouts from "@/lib/swr/use-partner-payouts";
import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import { PartnerPayoutResponse } from "@/lib/types";
import { PayoutRowMenu } from "@/ui/partners/payout-row-menu";
import { PayoutStatusBadgePartner } from "@/ui/partners/payout-status-badge-partner";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { PayoutStatus } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  Filter,
  SimpleTooltipContent,
  Table,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { InvoiceDollar, MoneyBill2 } from "@dub/ui/icons";
import {
  OG_AVATAR_URL,
  currencyFormatter,
  formatDate,
  formatPeriod,
} from "@dub/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PayoutDetailsSheet } from "./payout-details-sheet";
import { usePayoutFilters } from "./use-payout-filters";

export function PayoutTable() {
  const { queryParams, searchParams } = useRouterStuff();

  const sortBy = searchParams.get("sortBy") || "periodEnd";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const { payouts, error, loading } = usePartnerPayouts();
  const { payoutsCount } = usePartnerPayoutsCount<number>();
  const { filters, activeFilters, onSelect, onRemove, onRemoveAll } =
    usePayoutFilters();

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
        id: "periodEnd",
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
                `${OG_AVATAR_URL}${row.original.program.name}`
              }
              alt={row.original.program.name}
              className="size-4 rounded-sm"
            />
            <span>{row.original.program.name}</span>
          </div>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <PayoutStatusBadgePartner
            payout={row.original}
            program={row.original.program}
          />
        ),
      },
      {
        id: "paidAt",
        header: "Paid",
        cell: ({ row }) =>
          row.original.paidAt
            ? formatDate(row.original.paidAt, {
                month: "short",
              })
            : "-",
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <AmountRowItem
              amount={row.original.amount}
              status={row.original.status}
              minPayoutAmount={row.original.program.minPayoutAmount}
            />

            {["completed", "processing"].includes(row.original.status) && (
              <Tooltip content="View invoice">
                <div className="flex h-5 w-5 items-center justify-center rounded-md transition-colors duration-150 hover:border hover:border-neutral-200 hover:bg-neutral-100">
                  <Link
                    href={`/invoices/${row.original.id}`}
                    className="text-neutral-700"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <InvoiceDollar className="size-4" />
                  </Link>
                </div>
              </Tooltip>
            )}
          </div>
        ),
      },
      // Menu
      {
        id: "menu",
        enableHiding: false,
        minSize: 30,
        size: 30,
        maxSize: 30,
        cell: ({ row }) => <PayoutRowMenu row={row} />,
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["periodEnd", "amount", "paidAt"],
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
    onRowClick: (row) => {
      queryParams({
        set: {
          payoutId: row.original.id,
        },
        scroll: false,
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
        <div>
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
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

function AmountRowItem({
  amount,
  status,
  minPayoutAmount,
}: {
  amount: number;
  status: PayoutStatus;
  minPayoutAmount: number;
}) {
  const display = currencyFormatter(amount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (status === PayoutStatus.pending && amount < minPayoutAmount) {
    return (
      <Tooltip
        content={
          <SimpleTooltipContent
            title={`This program's minimum payout amount is ${currencyFormatter(
              minPayoutAmount / 100,
            )}. This payout will be accrued and processed during the next payout period.`}
            cta="Learn more."
            href="https://dub.co/help/article/receiving-payouts"
          />
        }
      >
        <span className="cursor-help truncate text-neutral-400 underline decoration-dotted underline-offset-2">
          {display}
        </span>
      </Tooltip>
    );
  }

  return display;
}
