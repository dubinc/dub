"use client";

import usePayoutsCount from "@/lib/swr/use-payouts-count";
import { PayoutWithPartnerProps } from "@/lib/types";
import { PayoutDetailsSheet } from "@/ui/programs/payout-details-sheet";
import { PayoutStatusBadges } from "@/ui/programs/payout-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
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
import { Dots, MoneyBill2, TableRows2 } from "@dub/ui/src/icons";
import {
  cn,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  formatDate,
} from "@dub/utils";
import { fetcher } from "@dub/utils/src/functions/fetcher";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { usePayoutFilters } from "./use-payout-filters";

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

  const { payoutsCount, error: countError } = usePayoutsCount();

  const {
    data: payouts,
    error,
    isLoading,
  } = useSWR<PayoutWithPartnerProps[]>(
    `/api/programs/${programId}/payouts?${searchQuery}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; payout: PayoutWithPartnerProps | null }
    | { open: true; payout: PayoutWithPartnerProps }
  >({ open: false, payout: null });

  const { pagination, setPagination } = usePagination();

  const table = useTable({
    data: payouts || [],
    loading: isLoading,
    error: error || countError ? "Failed to load payouts" : undefined,
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
        id: "amount",
        header: "Amount",
        accessorFn: (d) =>
          currencyFormatter(d.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        id: "fee",
        header: "Fee",
        accessorFn: (d) =>
          currencyFormatter(d.fee / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
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
    sortableColumns: ["periodStart"],
    sortBy,
    sortOrder: order,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sort: sortBy }),
          ...(sortOrder && { order: sortOrder }),
        },
      }),
    onRowClick: (row) =>
      setDetailsSheetState({ open: true, payout: row.original }),
    columnPinning: { right: ["menu"] },
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `payout${p ? "s" : ""}`,
    rowCount: payoutsCount?.all || 0,
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
    </>
  );
}

function RowMenuButton({ row }: { row: Row<PayoutWithPartnerProps> }) {
  const router = useRouter();
  const { slug, programId } = useParams();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[130px]">
            <MenuItem
              icon={TableRows2}
              label="View conversions"
              onSelect={() => {
                router.push(
                  `/${slug}/programs/${programId}/sales?partnerId=${row.original.partner.id}`,
                );
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
