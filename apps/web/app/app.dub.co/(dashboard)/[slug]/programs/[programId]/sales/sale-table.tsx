"use client";

import useSalesCount from "@/lib/swr/use-sales-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { getSalesResponseSchema } from "@/lib/zod/schemas/partners";
import FilterButton from "@/ui/analytics/events/filter-button";
import { SaleRowMenu } from "@/ui/partners/sale-row-menu";
import { SaleStatusBadges } from "@/ui/partners/sale-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  AnimatedSizeContainer,
  Filter,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { MoneyBill2 } from "@dub/ui/src/icons";
import {
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  formatDate,
} from "@dub/utils";
import { useParams } from "next/navigation";
import { memo } from "react";
import useSWR from "swr";
import { z } from "zod";
import { useSaleFilters } from "./use-sale-filters";

export function SaleTableBusiness({ limit }: { limit?: number }) {
  const filters = useSaleFilters();

  return <SaleTableBusinessInner limit={limit} {...filters} />;
}

const SaleTableBusinessInner = memo(
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
  }: { limit?: number } & ReturnType<typeof useSaleFilters>) => {
    const { programId } = useParams();
    const { id: workspaceId } = useWorkspace();
    const { pagination, setPagination } = usePagination(limit);
    const { queryParams, getQueryString, searchParamsObj } = useRouterStuff();
    const { sortBy, order } = searchParamsObj as {
      sortBy: string;
      order: "asc" | "desc";
    };

    const { salesCount } = useSalesCount();
    const { data: sales, error } = useSWR<
      z.infer<typeof getSalesResponseSchema>[]
    >(
      `/api/programs/${programId}/sales${getQueryString({
        workspaceId,
      })}`,
      fetcher,
    );

    const loading = !sales && !error;

    const table = useTable({
      data: sales?.slice(0, limit) || [],
      columns: [
        {
          id: "createdAt",
          header: "Date",
          accessorFn: (d) => formatDate(d.createdAt, { month: "short" }),
        },
        {
          header: "Customer",
          cell: ({ row }) => {
            return (
              <div className="flex items-center gap-2">
                <img
                  src={
                    row.original.customer.avatar ||
                    `${DICEBEAR_AVATAR_URL}${row.original.customer.name}`
                  }
                  alt={row.original.customer.name}
                  className="size-5 rounded-full"
                />
                <div>{row.original.customer.name}</div>
              </div>
            );
          },
          meta: {
            filterParams: ({ row }) => ({
              customerId: row.original.customer.id,
            }),
          },
        },
        {
          header: "Partner",
          cell: ({ row }) => {
            return (
              <div className="flex items-center gap-2">
                <img
                  src={
                    row.original.partner.image ||
                    `${DICEBEAR_AVATAR_URL}${row.original.partner.name}`
                  }
                  alt={row.original.partner.name}
                  className="size-5 rounded-full"
                />
                <div>{row.original.partner.name}</div>
              </div>
            );
          },
          meta: {
            filterParams: ({ row }) => ({
              partnerId: row.original.partner.id,
            }),
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
          header: "Status",
          cell: ({ row }) => {
            const badge = SaleStatusBadges[row.original.status];

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
          cell: ({ row }) => <SaleRowMenu row={row} />,
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
          meta?.filterParams && <FilterButton set={meta.filterParams(cell)} />
        );
      },
      ...(!limit && {
        pagination,
        onPaginationChange: setPagination,
        sortableColumns: ["createdAt", "amount"],
        sortBy,
        sortOrder: order,
        onSortChange: ({ sortBy, sortOrder }) =>
          queryParams({
            set: {
              ...(sortBy && { sortBy: sortBy }),
              ...(sortOrder && { order: sortOrder }),
            },
          }),
      }),
      thClassName: "border-l-0",
      tdClassName: "border-l-0",
      resourceName: (p) => `sale${p ? "s" : ""}`,
      rowCount: salesCount?.[status || "all"] ?? 0,
      loading,
      error: error ? "Failed to load sales" : undefined,
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
              <SimpleDateRangePicker className="w-full sm:min-w-[200px] md:w-fit" />
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
        {sales?.length !== 0 ? (
          <Table {...table} />
        ) : (
          <AnimatedEmptyState
            title="No sales found"
            description={
              isFiltered
                ? "No sales found for the selected filters."
                : "No sales have been made for this program yet."
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
