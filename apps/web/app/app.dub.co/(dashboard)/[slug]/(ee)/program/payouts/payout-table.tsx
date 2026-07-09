"use client";

import useGroups from "@/lib/swr/use-groups";
import { usePayoutsCount } from "@/lib/swr/use-payouts-count";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS } from "@/lib/tremendous/constants";
import { PayoutResponse } from "@/lib/types";
import { ExternalPayoutsIndicator } from "@/ui/partners/external-payouts-indicator";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  AnimatedSizeContainer,
  Button,
  DynamicTooltipWrapper,
  EditColumnsButton,
  Filter,
  StatusBadge,
  Table,
  Tooltip,
  TooltipContent,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { MoneyBill2 } from "@dub/ui/icons";
import { cn, currencyFormatter } from "@dub/utils";
import { formatPeriod } from "@dub/utils/src/functions/datetime";
import { fetcher } from "@dub/utils/src/functions/fetcher";
import {
  PartnerPayoutMethod,
  PayoutStatus,
  ProgramPayoutMode,
} from "@prisma/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { PayoutPaidCell } from "./payout-paid-cell";
import { usePayoutFilters } from "./use-payout-filters";

/** Matches server `getPayoutEligibilityFilter` and in-table warnings in `AmountRowItem`. */
function isPayoutEligibleForBatchConfirm(
  payout: PayoutResponse,
  {
    minPayoutAmount,
    programPayoutMode,
  }: {
    minPayoutAmount: number;
    programPayoutMode: ProgramPayoutMode;
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

  if (
    payout.partner.defaultPayoutMethod === PartnerPayoutMethod.tremendous &&
    payout.amount > TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS
  ) {
    return false;
  }

  return true;
}

const PAYOUTS_MAX_PAGE_SIZE = 50;

const payoutsColumns = {
  all: ["periodEnd", "partner", "group", "status", "initiatedAt", "amount"],
  defaultVisible: ["periodEnd", "partner", "status", "initiatedAt", "amount"],
};

export function PayoutTable() {
  const router = useRouter();
  const { queryParams, searchParams, searchParamsObj, getQueryString } =
    useRouterStuff();

  const {
    id: workspaceId,
    slug: workspaceSlug,
    defaultProgramId,
  } = useWorkspace();

  const { program } = useProgram();
  const { groups } = useGroups();
  const minPayoutAmount = program?.minPayoutAmount ?? 0;

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "payouts-table-columns",
    {
      all: payoutsColumns.all,
      defaultVisible: payoutsColumns.defaultVisible,
    },
  );

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

  const isFiltered = Object.keys(searchParamsObj).some(
    (key) => !["sortBy", "sortOrder", "page"].includes(key),
  );

  const columns = useMemo(
    () =>
      [
        {
          id: "periodEnd",
          header: "Period",
          accessorFn: (d: PayoutResponse) => formatPeriod(d),
        },
        {
          id: "partner",
          header: "Partner",
          cell: ({ row }) => {
            return <PartnerRowItem partner={row.original.partner} />;
          },
        },
        {
          id: "group",
          header: "Partner Group",
          cell: ({ row }) => {
            if (!groups) return "-";

            const group = groups.find(
              (g) => g.id === row.original.partner.groupId,
            );

            if (!group) return "-";

            return (
              <div className="flex items-center gap-2">
                <GroupColorCircle group={group} />
                <Link
                  href={`/${workspaceSlug}/program/groups/${group.slug}`}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  onAuxClick={(e) => e.stopPropagation()}
                  className="min-w-0 cursor-alias truncate text-sm font-medium decoration-dotted hover:underline"
                  title={group.name}
                >
                  {group.name}
                </Link>
              </div>
            );
          },
        },
        {
          id: "status",
          header: "Status",
          cell: ({ row }) => {
            const badge = PayoutStatusBadges[row.original.status];

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
          cell: ({ row }) => <AmountRowItem payout={row.original} />,
        },
        {
          id: "menu",
          enableHiding: false,
          header: ({ table }) => <EditColumnsButton table={table} />,
          cell: () => null,
        },
      ].filter((c) => c.id === "menu" || payoutsColumns.all.includes(c.id)),
    [groups, workspaceSlug],
  );

  const { table, ...tableProps } = useTable({
    data: payouts || [],
    loading: isLoading,
    error: error || countError ? "Failed to load payouts" : undefined,
    columns,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
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
      };

      const hasIneligibleAmongSelection =
        selectedPayouts.length > 0 &&
        selectedPayouts.some(
          (payout) => !isPayoutEligibleForBatchConfirm(payout, eligibilityCtx),
        );

      const maxGiftCardPayoutAmount = currencyFormatter(
        TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS,
        {
          trailingZeroDisplay: "stripIfInteger",
        },
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
                    Exceeds the {maxGiftCardPayoutAmount} cap for gift card
                    payouts
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
}: {
  payout: Pick<PayoutResponse, "amount" | "status" | "mode" | "partner">;
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

    if (
      payout.partner.defaultPayoutMethod === PartnerPayoutMethod.tremendous &&
      payout.amount > TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS
    ) {
      const maxPayoutAmount = currencyFormatter(
        TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS,
        {
          trailingZeroDisplay: "stripIfInteger",
        },
      );

      return (
        <Tooltip
          content={`This payout exceeds the ${maxPayoutAmount} cap for gift card payouts. The partner must connect another payout method to receive this amount.`}
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
