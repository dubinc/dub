"use client";

import usePayoutsCount from "@/lib/swr/use-payouts-count";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutResponse } from "@/lib/types";
import { AmountRowItem } from "@/ui/partners/amount-row-item";
import { useMarkAsPaidModal } from "@/ui/partners/mark-as-paid-modal";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PayoutDetailsSheet } from "@/ui/partners/payout-details-sheet";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { PayoutTypeBadge } from "@/ui/partners/payout-type-badge";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  AnimatedSizeContainer,
  Button,
  Filter,
  Icon,
  Popover,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CircleCheck, Dots, MoneyBill2, MoneyBills2 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { formatDate, formatPeriod } from "@dub/utils/src/functions/datetime";
import { fetcher } from "@dub/utils/src/functions/fetcher";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useParams, useRouter } from "next/navigation";
import { memo, useEffect, useState } from "react";
import useSWR from "swr";
import { usePayoutFilters } from "./use-payout-filters";

export function PayoutTable() {
  const { searchParams } = useRouterStuff();

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const filters = usePayoutFilters({ sortBy, sortOrder });

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
    const { program } = useProgram();
    const { id: workspaceId } = useWorkspace();
    const { queryParams, searchParams, getQueryString } = useRouterStuff();

    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const { payoutsCount, error: countError } = usePayoutsCount<number>();

    const {
      data: payouts,
      error,
      isLoading,
    } = useSWR<PayoutResponse[]>(
      program?.id
        ? `/api/programs/${program.id}/payouts${getQueryString(
            { workspaceId },
            {
              exclude: ["payoutId"],
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
      }
    }, [searchParams, payouts]);

    const { pagination, setPagination } = usePagination();

    const table = useTable({
      data: payouts || [],
      loading: isLoading,
      error: error || countError ? "Failed to load payouts" : undefined,
      columns: [
        {
          id: "periodStart",
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
          id: "paidAt",
          header: "Paid",
          cell: ({ row }) =>
            row.original.paidAt
              ? formatDate(row.original.paidAt, {
                  month: "short",
                  day: "numeric",
                  year: undefined,
                })
              : "-",
        },
        {
          id: "amount",
          header: "Amount",
          cell: ({ row }) => (
            <AmountRowItem
              amount={row.original.amount}
              status={row.original.status}
              payoutsEnabled={Boolean(row.original.partner.payoutsEnabledAt)}
              minPayoutAmount={program?.minPayoutAmount!}
            />
          ),
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
      sortableColumns: ["periodStart", "amount", "paidAt"],
      sortBy,
      sortOrder,
      onSortChange: ({ sortBy, sortOrder }) =>
        queryParams({
          set: {
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
          },
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
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Filter.Select
                className="w-full md:w-fit"
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
                onSearchChange={setSearch}
                onSelectedFilterChange={setSelectedFilter}
              />
              <SimpleDateRangePicker className="w-fit" defaultInterval="all" />
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
      </>
    );
  },
);

function RowMenuButton({ row }: { row: Row<PayoutResponse> }) {
  const router = useRouter();
  const { slug, programId } = useParams();
  const [isOpen, setIsOpen] = useState(false);

  const { setShowMarkAsPaidModal, MarkAsPaidModal } = useMarkAsPaidModal({
    payout: row.original,
  });

  const isSales = row.original.type === "sales";
  const isPayable = ["pending", "failed"].includes(row.original.status);

  if (!isSales && !isPayable) return null;

  return (
    <>
      <MarkAsPaidModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[140px]">
              {isSales && (
                <MenuItem
                  icon={MoneyBills2}
                  label="View sales"
                  onSelect={() => {
                    router.push(
                      `/${slug}/programs/${programId}/sales?payoutId=${row.original.id}&interval=all`,
                    );
                    setIsOpen(false);
                  }}
                />
              )}
              {isPayable && (
                <MenuItem
                  icon={CircleCheck}
                  label="Mark as paid"
                  onSelect={() => {
                    setShowMarkAsPaidModal(true);
                    setIsOpen(false);
                  }}
                />
              )}
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
        "data-[selected=true]:bg-neutral-100",
      )}
      onSelect={onSelect}
    >
      <IconComp className="size-4 shrink-0 text-neutral-500" />
      {label}
    </Command.Item>
  );
}
