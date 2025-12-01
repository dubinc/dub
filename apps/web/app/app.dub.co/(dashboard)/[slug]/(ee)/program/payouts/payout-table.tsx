"use client";

import { useFraudGroupCount } from "@/lib/swr/use-fraud-groups-count";
import usePayoutsCount from "@/lib/swr/use-payouts-count";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudGroupCountByPartner, PayoutResponse } from "@/lib/types";
import { ExternalPayoutsIndicator } from "@/ui/partners/external-payouts-indicator";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { PayoutStatus } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  DynamicTooltipWrapper,
  Filter,
  StatusBadge,
  Table,
  Tooltip,
  TooltipContent,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { MoneyBill2 } from "@dub/ui/icons";
import { cn, currencyFormatter } from "@dub/utils";
import { formatPeriod } from "@dub/utils/src/functions/datetime";
import { fetcher } from "@dub/utils/src/functions/fetcher";
import { PayoutDetailsSheet } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/payouts/payout-details-sheet";
import { PayoutPaidCell } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/payouts/payout-paid-cell";
import { useParams } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { usePayoutFilters } from "./use-payout-filters";

export function PayoutTable() {
  const filters = usePayoutFilters();
  return <PayoutTableInner {...filters} />;
}

const PayoutTableInner = memo(
  ({
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
    setSearch,
    setSelectedFilter,
  }: ReturnType<typeof usePayoutFilters>) => {
    const { id: workspaceId, defaultProgramId } = useWorkspace();
    const { queryParams, searchParams, getQueryString } = useRouterStuff();

    const sortBy = searchParams.get("sortBy") || "amount";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const { payoutsCount, error: countError } = usePayoutsCount<number>();

    const {
      data: payouts,
      error,
      isLoading,
    } = useSWR<PayoutResponse[]>(
      defaultProgramId
        ? `/api/programs/${defaultProgramId}/payouts${getQueryString(
            { workspaceId },
            {
              exclude: ["payoutId", "selectedPayoutId", "excludedPayoutIds"],
            },
          )}`
        : undefined,
      fetcher,
      {
        keepPreviousData: true,
      },
    );

    const [detailsSheetState, setDetailsSheetState] = useState<
      | { open: false; payout: PayoutResponse | null }
      | { open: true; payout: PayoutResponse }
    >({ open: false, payout: null });

    useEffect(() => {
      const payoutId = searchParams.get("payoutId");
      if (payoutId) {
        const payout = payouts?.find((p) => p.id === payoutId);
        if (payout) {
          setDetailsSheetState({ open: true, payout });
        }
      } else {
        setDetailsSheetState({ open: false, payout: null });
      }
    }, [searchParams, payouts]);

    const { pagination, setPagination } = usePagination();

    const { fraudGroupCount } = useFraudGroupCount<FraudGroupCountByPartner[]>({
      query: {
        groupBy: "partnerId",
        status: "pending",
      },
    });

    // Memoized map of partner IDs with pending fraud events
    const fraudEventsCountMap = useMemo(() => {
      if (!fraudGroupCount) {
        return new Set<string>();
      }

      return new Set(fraudGroupCount.map(({ partnerId }) => partnerId));
    }, [fraudGroupCount]);

    const table = useTable({
      data: payouts || [],
      loading: isLoading,
      error: error || countError ? "Failed to load payouts" : undefined,
      columns: [
        {
          id: "periodEnd",
          header: "Period",
          accessorFn: (d) => formatPeriod(d),
        },
        {
          header: "Partner",
          cell: ({ row }) => {
            return <PartnerRowItem partner={row.original.partner} />;
          },
        },
        {
          header: "Status",
          cell: ({ row }) => {
            const hasFraudPending = fraudEventsCountMap.has(
              row.original.partner.id,
            );

            const status =
              hasFraudPending && row.original.status === "pending"
                ? "hold"
                : row.original.status;

            const badge = PayoutStatusBadges[status];

            return badge ? (
              <StatusBadge icon={badge.icon} variant={badge.variant}>
                <DynamicTooltipWrapper
                  tooltipProps={
                    row.original.status === "failed" &&
                    row.original.failureReason
                      ? {
                          content: row.original.failureReason,
                        }
                      : undefined
                  }
                >
                  {badge.label}
                </DynamicTooltipWrapper>
              </StatusBadge>
            ) : (
              "-"
            );
          },
        },
        {
          id: "initiatedAt",
          header: "Paid",
          cell: ({ row }) => (
            <PayoutPaidCell
              initiatedAt={row.original.initiatedAt}
              paidAt={row.original.paidAt}
              user={row.original.user}
            />
          ),
        },
        {
          id: "amount",
          header: "Amount",
          cell: ({ row }) => (
            <AmountRowItem
              payout={row.original}
              hasFraudPending={fraudEventsCountMap.has(row.original.partner.id)}
            />
          ),
        },
      ],
      pagination,
      onPaginationChange: setPagination,
      sortableColumns: ["amount", "initiatedAt"],
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
      columnPinning: { right: ["menu"] },
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
          <div>
            <Filter.Select
              className="w-full md:w-fit"
              filters={filters}
              activeFilters={activeFilters}
              onSelect={onSelect}
              onRemove={onRemove}
              onSearchChange={setSearch}
              onSelectedFilterChange={setSelectedFilter}
            />
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
      </>
    );
  },
);

function AmountRowItem({
  payout,
  hasFraudPending,
}: {
  payout: Pick<PayoutResponse, "amount" | "status" | "mode" | "partner">;
  hasFraudPending: boolean;
}) {
  const { slug } = useParams();
  const { program } = useProgram();

  const minPayoutAmount = program?.minPayoutAmount || 0;
  const display = currencyFormatter(payout.amount);

  if (payout.status === PayoutStatus.pending) {
    if (payout.amount < minPayoutAmount) {
      return (
        <Tooltip
          content={
            <TooltipContent
              title={`Your program's minimum payout amount is ${currencyFormatter(
                minPayoutAmount,
              )}. This payout will be accrued and processed during the next payout period.`}
              cta="Update minimum payout amount"
              href={`/${slug}/program/payouts?status=pending`}
              target="_blank"
            />
          }
        >
          <span className="cursor-help truncate text-neutral-400 underline decoration-dotted underline-offset-2">
            {display}
          </span>
        </Tooltip>
      );
    }

    if (payout.mode === "external") {
      return (
        <div className="flex items-center gap-1.5">
          <DynamicTooltipWrapper
            tooltipProps={{
              content: payout.partner?.tenantId ? undefined : (
                <TooltipContent
                  title="This partner does not have a tenant ID configured, which is required to process external payouts."
                  cta="Learn more"
                  href="http://dub.co/docs/partners/external-payouts"
                  target="_blank"
                />
              ),
            }}
          >
            <span
              className={cn(
                "truncate",
                payout.partner?.tenantId
                  ? "text-neutral-700"
                  : "text-neutral-400 underline decoration-dotted underline-offset-2",
              )}
            >
              {display}
            </span>
          </DynamicTooltipWrapper>
          {payout.partner?.tenantId && <ExternalPayoutsIndicator />}
        </div>
      );
    }

    if (payout.mode === "internal" && !payout.partner?.payoutsEnabledAt) {
      return (
        <Tooltip content="This partner does not have payouts enabled, which means they will not be able to receive any payouts from this program.">
          <span className="cursor-help truncate text-neutral-400 underline decoration-dotted underline-offset-2">
            {display}
          </span>
        </Tooltip>
      );
    }

    if (hasFraudPending) {
      return (
        <Tooltip
          content={`This partner's payouts are on hold due to [unresolved fraud events](${`/${slug}/program/fraud?partnerId=${payout.partner.id}`}). They cannot be paid out until resolved.`}
        >
          <span className="cursor-help truncate text-neutral-400 underline decoration-dotted underline-offset-2">
            {display}
          </span>
        </Tooltip>
      );
    }
  }

  return display;
}
