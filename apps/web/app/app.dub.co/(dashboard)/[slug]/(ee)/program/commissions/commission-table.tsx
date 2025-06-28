"use client";

import useCommissionsCount from "@/lib/swr/use-commissions-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse } from "@/lib/types";
import { CLAWBACK_REASONS_MAP } from "@/lib/zod/schemas/commissions";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { CommissionRowMenu } from "@/ui/partners/commission-row-menu";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  AnimatedSizeContainer,
  Filter,
  StatusBadge,
  Table,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { MoneyBill2 } from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  fetcher,
  formatDateTime,
  formatDateTimeSmart,
  nFormatter,
} from "@dub/utils";
import { memo } from "react";
import useSWR from "swr";
import { useCommissionFilters } from "./use-commission-filters";

export function CommissionTable({ limit }: { limit?: number }) {
  const filters = useCommissionFilters();

  return <CommissionTableInner limit={limit} {...filters} />;
}

const CommissionTableInner = memo(
  ({
    limit,
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
    setSearch,
    setSelectedFilter,
  }: { limit?: number } & ReturnType<typeof useCommissionFilters>) => {
    const { id: workspaceId, slug } = useWorkspace();
    const { pagination, setPagination } = usePagination(limit);
    const { queryParams, getQueryString, searchParamsObj } = useRouterStuff();
    const { sortBy, sortOrder } = searchParamsObj as {
      sortBy: string;
      sortOrder: "asc" | "desc";
    };

    const {
      data: commissions,
      error,
      isLoading,
    } = useSWR<CommissionResponse[]>(
      `/api/commissions${getQueryString({
        workspaceId,
      })}`,
      fetcher,
      {
        keepPreviousData: true,
      },
    );

    const { commissionsCount } = useCommissionsCount({
      exclude: ["status", "page"],
    });

    const table = useTable<CommissionResponse>({
      data: commissions?.slice(0, limit) || [],
      columns: [
        {
          id: "createdAt",
          header: "Date",
          cell: ({ row }) => (
            <p title={formatDateTime(row.original.createdAt)}>
              {formatDateTimeSmart(row.original.createdAt)}
            </p>
          ),
        },
        {
          id: "customer",
          header: "Customer",
          cell: ({ row }) =>
            row.original.customer ? (
              <CustomerRowItem
                customer={row.original.customer}
                href={`/${slug}/customers/${row.original.customer.id}`}
              />
            ) : (
              "-"
            ),
          meta: {
            filterParams: ({ row }) =>
              row.original.customer
                ? {
                    customerId: row.original.customer.id,
                  }
                : {},
          },
        },
        {
          header: "Partner",
          cell: ({ row }) => {
            return <PartnerRowItem partner={row.original.partner} />;
          },
          size: 200,
          meta: {
            filterParams: ({ row }) => ({
              partnerId: row.original.partner.id,
            }),
          },
        },
        {
          id: "type",
          header: "Type",
          accessorKey: "type",
          cell: ({ row }) => (
            <CommissionTypeBadge type={row.original.type ?? "sale"} />
          ),
          meta: {
            filterParams: ({ row }) => ({
              type: row.original.type,
            }),
          },
        },
        {
          id: "amount",
          header: "Amount",
          accessorFn: (d) =>
            d.type === "sale"
              ? currencyFormatter(d.amount / 100, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : nFormatter(d.quantity),
        },
        {
          id: "commission",
          header: "Commission",
          cell: ({ row }) => {
            const commission = row.original;

            const earnings = currencyFormatter(commission.earnings / 100, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            if (commission.description) {
              const reason =
                CLAWBACK_REASONS_MAP[commission.description]?.description ??
                commission.description;

              return (
                <Tooltip content={reason}>
                  <span
                    className={cn(
                      "cursor-help truncate underline decoration-dotted underline-offset-2",
                      commission.earnings < 0 && "text-red-600",
                    )}
                  >
                    {earnings}
                  </span>
                </Tooltip>
              );
            }

            return (
              <span
                className={cn(
                  commission.earnings < 0 && "text-red-600",
                  "truncate",
                )}
              >
                {earnings}
              </span>
            );
          },
        },
        {
          header: "Status",
          cell: ({ row }) => {
            const badge = CommissionStatusBadges[row.original.status];

            return (
              <StatusBadge icon={null} variant={badge.variant}>
                {badge.label}
              </StatusBadge>
            );
          },
        },
        // Menu
        {
          id: "menu",
          enableHiding: false,
          minSize: 43,
          size: 43,
          maxSize: 43,
          cell: ({ row }) => <CommissionRowMenu row={row} />,
        },
      ],
      columnPinning: { right: ["menu"] },
      cellRight: (cell) => {
        const meta = cell.column.columnDef.meta as
          | {
              filterParams?: any;
            }
          | undefined;

        return (
          !limit &&
          meta?.filterParams && (
            <FilterButtonTableRow set={meta.filterParams(cell)} />
          )
        );
      },
      ...(!limit && {
        pagination,
        onPaginationChange: setPagination,
        sortableColumns: ["createdAt", "amount"],
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
      }),
      thClassName: "border-l-0",
      tdClassName: "border-l-0",
      resourceName: (p) => `commission${p ? "s" : ""}`,
      rowCount: commissionsCount?.[searchParamsObj.status || "all"].count ?? 0,
      loading: isLoading,
      error: error ? "Failed to load commissions" : undefined,
    });

    return (
      <div className="flex flex-col gap-3">
        {!limit && (
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
              <SimpleDateRangePicker
                className="w-full sm:min-w-[200px] md:w-fit"
                defaultInterval="all"
              />
            </div>
            <AnimatedSizeContainer height>
              <div>
                {activeFilters.length > 0 && (
                  <div className="pt-3">
                    <Filter.List
                      filters={[
                        ...filters,
                        {
                          key: "payoutId",
                          icon: MoneyBill2,
                          label: "Payout",
                          options: [],
                        },
                      ]}
                      activeFilters={activeFilters}
                      onRemove={onRemove}
                      onRemoveAll={onRemoveAll}
                    />
                  </div>
                )}
              </div>
            </AnimatedSizeContainer>
          </div>
        )}
        {commissions?.length !== 0 || isLoading ? (
          <Table {...table} />
        ) : (
          <AnimatedEmptyState
            title="No commissions found"
            description={
              isFiltered
                ? "No commissions found for the selected filters."
                : "No commissions have been made for this program yet."
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
  },
);
