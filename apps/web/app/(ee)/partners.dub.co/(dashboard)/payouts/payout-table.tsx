"use client";

import { INVOICE_AVAILABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
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
  Table,
  TimestampTooltip,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  CircleArrowRight,
  CircleHalfDottedClock,
  InvoiceDollar,
  MoneyBill2,
} from "@dub/ui/icons";
import {
  OG_AVATAR_URL,
  currencyFormatter,
  formatDateSmart,
  formatDateTimeSmart,
  formatPeriod,
} from "@dub/utils";
import { addBusinessDays } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PayoutDetailsSheet } from "./partner-payout-details-sheet";
import { usePayoutFilters } from "./use-payout-filters";

export function PayoutTable() {
  const { queryParams, searchParams } = useRouterStuff();

  const sortBy = searchParams.get("sortBy") || "initiatedAt";
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
              className="size-4 rounded-full"
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
        id: "initiatedAt",
        header: "Initiated",
        meta: {
          headerTooltip:
            "Date and time when the payout was initiated by the program. Payouts usually take up to 5 business days to be fully processed.",
        },
        cell: ({ row }) =>
          row.original.initiatedAt ? (
            <TimestampTooltip
              timestamp={row.original.initiatedAt}
              side="right"
              rows={["local", "utc"]}
            >
              <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
                {formatDateSmart(row.original.initiatedAt, { month: "short" })}
              </span>
            </TimestampTooltip>
          ) : (
            "-"
          ),
      },
      {
        id: "paidAt",
        header: "Paid",
        meta: {
          headerTooltip:
            "Date and time when the payout was fully processed by the program and paid to your account.",
        },
        cell: ({ row }) =>
          row.original.paidAt ? (
            <TimestampTooltip
              timestamp={row.original.paidAt}
              side="right"
              rows={["local", "utc"]}
            >
              <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
                {formatDateSmart(row.original.paidAt, { month: "short" })}
              </span>
            </TimestampTooltip>
          ) : row.original.initiatedAt ? (
            <Tooltip
              content={`This payout is estimated to be processed on \`${formatDateTimeSmart(addBusinessDays(row.original.initiatedAt, 5), { month: "short" })}\` (after 5 business days)`}
            >
              <span className="hover:text-content-emphasis text-content-muted flex items-center gap-1 underline decoration-dotted underline-offset-2">
                <CircleHalfDottedClock className="size-3.5 shrink-0" />{" "}
                {formatDateSmart(addBusinessDays(row.original.initiatedAt, 5), {
                  month: "short",
                })}
              </span>
            </Tooltip>
          ) : (
            "-"
          ),
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <AmountRowItem payout={row.original} />

            {row.original.mode === "internal" &&
              INVOICE_AVAILABLE_PAYOUT_STATUSES.includes(
                row.original.status,
              ) && (
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
    sortableColumns: ["amount", "initiatedAt", "paidAt"],
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
    rowCount: payoutsCount || 0,
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
        <div className="flex flex-col gap-3">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          <AnimatedSizeContainer height>
            {activeFilters.length > 0 && (
              <Filter.List
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
                onRemoveAll={onRemoveAll}
              />
            )}
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

function AmountRowItem({ payout }: { payout: PartnerPayoutResponse }) {
  const display = currencyFormatter(payout.amount);

  if (
    payout.status === PayoutStatus.pending &&
    payout.amount < payout.program.minPayoutAmount
  ) {
    return (
      <Tooltip
        content={`This program's [minimum payout amount](https://dub.co/help/article/commissions-payouts#what-does-minimum-payout-amount-mean) is ${currencyFormatter(
          payout.program.minPayoutAmount,
          { trailingZeroDisplay: "stripIfInteger" },
        )}. This payout will be accrued and processed during the next payout period.`}
      >
        <span className="cursor-help truncate text-neutral-400 underline decoration-dotted underline-offset-2">
          {display}
        </span>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {display}
      {payout.mode === "external" && (
        <Tooltip
          content={
            payout.status === PayoutStatus.pending
              ? `This payout will be made externally through your ${payout.program.name} account after approval.`
              : `This payout was made externally through your ${payout.program.name} account.`
          }
        >
          <CircleArrowRight className="size-3.5 shrink-0 text-neutral-500" />
        </Tooltip>
      )}
    </div>
  );
}
