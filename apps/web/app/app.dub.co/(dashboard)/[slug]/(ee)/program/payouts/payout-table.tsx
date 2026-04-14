"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { useFraudGroupCount } from "@/lib/swr/use-fraud-groups-count";
import { usePayoutsCount } from "@/lib/swr/use-payouts-count";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudGroupCountByPartner, PayoutResponse } from "@/lib/types";
import { ExternalPayoutsIndicator } from "@/ui/partners/external-payouts-indicator";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { PayoutStatus, ProgramPayoutMode } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  Button,
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
import { PayoutPaidCell } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/payouts/payout-paid-cell";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { usePayoutFilters } from "./use-payout-filters";

/** Matches server `getPayoutEligibilityFilter` and in-table warnings in `AmountRowItem`. */
function isPayoutEligibleForBatchConfirm(
  payout: PayoutResponse,
  {
    minPayoutAmount,
    programPayoutMode,
    canManageFraudEvents,
    partnersWithPendingFraud,
  }: {
    minPayoutAmount: number;
    programPayoutMode: ProgramPayoutMode;
    canManageFraudEvents: boolean;
    partnersWithPendingFraud: Set<string>;
  },
) {
  if (payout.status !== PayoutStatus.pending) {
    return false;
  }

  if (payout.amount < minPayoutAmount) {
    return false;
  }

  // Derive effective mode the same way server does
  const effectiveMode = payout.partner.payoutsEnabledAt
    ? "internal"
    : programPayoutMode === "hybrid" || programPayoutMode === "external"
      ? "external"
      : programPayoutMode;

  if (effectiveMode === "external" && !payout.partner?.tenantId) {
    return false;
  }
  if (effectiveMode === "internal" && !payout.partner?.payoutsEnabledAt) {
    return false;
  }

  if (canManageFraudEvents && partnersWithPendingFraud.has(payout.partner.id)) {
    return false;
  }

  return true;
}

const PAYOUTS_MAX_PAGE_SIZE = 50;

export function PayoutTable() {
  const router = useRouter();
  const { queryParams, searchParams, searchParamsObj, getQueryString } =
    useRouterStuff();

  const {
    id: workspaceId,
    slug: workspaceSlug,
    plan,
    defaultProgramId,
  } = useWorkspace();

  const { program } = useProgram();
  const minPayoutAmount = program?.minPayoutAmount ?? 0;

  const sortBy = searchParams.get("sortBy") || "amount";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const { payoutsCount, error: countError } = usePayoutsCount();

  const {
    data: payouts,
    error,
    isLoading,
  } = useSWR<PayoutResponse[]>(
    defaultProgramId
      ? `/api/payouts${getQueryString(
          { workspaceId, pageSize: PAYOUTS_MAX_PAGE_SIZE },
          {
            exclude: [
              "payoutId",
              "selectedPayoutId",
              "selectedPayoutIds",
              "excludedPayoutIds",
            ],
          },
        )}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { pagination, setPagination } = usePagination(PAYOUTS_MAX_PAGE_SIZE);

  const { canManageFraudEvents } = getPlanCapabilities(plan);

  const { fraudGroupCount } = useFraudGroupCount<FraudGroupCountByPartner[]>({
    query: {
      groupBy: "partnerId",
      status: "pending",
    },
    ignoreParams: true,
  });

  // Memoized map of partner IDs with pending fraud events
  const fraudGroupCountMap = useMemo(() => {
    if (!fraudGroupCount) {
      return new Set<string>();
    }

    return new Set(fraudGroupCount.map(({ partnerId }) => partnerId));
  }, [fraudGroupCount]);

  const isFiltered = Object.keys(searchParamsObj).some(
    (key) => !["sortBy", "sortOrder", "page"].includes(key),
  );

  const { table, ...tableProps } = useTable({
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
          const hasPendingFraudEvents =
            canManageFraudEvents &&
            fraudGroupCountMap.has(row.original.partner.id);

          const status =
            hasPendingFraudEvents && row.original.status === "pending"
              ? "hold"
              : row.original.status;

          const badge = PayoutStatusBadges[status];

          return badge ? (
            <StatusBadge icon={badge.icon} variant={badge.variant}>
              <DynamicTooltipWrapper
                tooltipProps={
                  row.original.status === "failed" && row.original.failureReason
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
            hasPendingFraudEvents={
              canManageFraudEvents &&
              fraudGroupCountMap.has(row.original.partner.id)
            }
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
    onRowClick: (row, e) => {
      const url = `/${workspaceSlug}/program/payouts/${row.original.id}`;
      if (e.metaKey || e.ctrlKey) window.open(url, "_blank");
      else router.push(url);
    },
    onRowAuxClick: (row) =>
      window.open(
        `/${workspaceSlug}/program/payouts/${row.original.id}`,
        "_blank",
      ),
    rowProps: (row) => ({
      onPointerEnter: () =>
        router.prefetch(`/${workspaceSlug}/program/payouts/${row.original.id}`),
    }),
    getRowId: (row) => row.id,
    selectionControls: (table) => {
      const selectedPayouts = table
        .getSelectedRowModel()
        .rows.map((r) => r.original);

      const eligibilityCtx = {
        minPayoutAmount,
        programPayoutMode: program?.payoutMode ?? "internal",
        canManageFraudEvents,
        partnersWithPendingFraud: fraudGroupCountMap,
      };

      const hasIneligibleAmongSelection =
        selectedPayouts.length > 0 &&
        selectedPayouts.some(
          (payout) => !isPayoutEligibleForBatchConfirm(payout, eligibilityCtx),
        );

      return (
        <Button
          variant="primary"
          text="Confirm selected"
          className="h-7 w-fit rounded-lg px-2.5"
          disabled={hasIneligibleAmongSelection}
          disabledTooltip={
            hasIneligibleAmongSelection ? (
              <div className="max-w-xs space-y-2 px-4 py-3 text-left text-sm">
                <p>
                  Your selection includes payouts that are ineligible for
                  payment:
                </p>
                <ul className="list-disc space-y-1 pl-4 marker:text-neutral-500">
                  <li>
                    Below the{" "}
                    <a
                      href="https://dub.co/help/article/partner-payouts#minimum-payout-amount"
                      target="_blank"
                      className="cursor-help underline decoration-dotted underline-offset-2"
                    >
                      minimum payout amount
                    </a>
                  </li>
                  <li>Partner has not connected payouts</li>
                  <li>
                    On hold due to{" "}
                    <Link
                      href={`/${workspaceSlug}/program/payouts?status=hold`}
                      className="cursor-alias underline decoration-dotted underline-offset-2"
                    >
                      unresolved fraud events
                    </Link>
                  </li>
                </ul>
              </div>
            ) : undefined
          }
          onClick={() => {
            const current = table
              .getSelectedRowModel()
              .rows.map((r) => r.original);
            const pendingEligible = current.filter((p) =>
              isPayoutEligibleForBatchConfirm(p, eligibilityCtx),
            );

            if (pendingEligible.length === 0) {
              toast.error("Select at least one eligible pending payout.");
              return;
            }

            queryParams({
              set: {
                confirmPayouts: "true",
                selectedPayoutIds: pendingEligible.map((p) => p.id).join(","),
              },
              del: ["selectedPayoutId", "excludedPayoutIds"],
              scroll: false,
            });
          }}
        />
      );
    },
    columnPinning: { left: ["select"], right: ["menu"] },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `payout${p ? "s" : ""}`,
    rowCount: payoutsCount?.[0]?.count ?? 0,
  });

  return (
    <div className="flex flex-col gap-4">
      <PayoutFilters />
      {payouts?.length !== 0 ? (
        <Table {...tableProps} table={table} />
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

function PayoutFilters() {
  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    setSearch,
    setSelectedFilter,
  } = usePayoutFilters();

  return (
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
  );
}

function AmountRowItem({
  payout,
  hasPendingFraudEvents,
}: {
  payout: Pick<PayoutResponse, "amount" | "status" | "mode" | "partner">;
  hasPendingFraudEvents: boolean;
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
        <Tooltip content="This partner has not [connected a bank account](https://dub.co/help/article/receiving-payouts) to receive payouts yet, which means they won't be able to receive payouts from your program.">
          <span className="cursor-help truncate text-neutral-400 underline decoration-dotted underline-offset-2">
            {display}
          </span>
        </Tooltip>
      );
    }

    if (hasPendingFraudEvents) {
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
