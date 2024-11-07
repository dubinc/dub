"use client";

import { generateRandomName } from "@/lib/names";
import { saleEventResponseSchema } from "@/lib/zod/schemas/sales";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Avatar,
  CopyButton,
  Filter,
  Table,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { MoneyBill2 } from "@dub/ui/src/icons";
import { currencyFormatter, fetcher, formatDate } from "@dub/utils";
import useSWR from "swr";
import { z } from "zod";
import { useSaleFilters } from "./use-sale-filters";

export function SaleTable({ programId }: { programId: string }) {
  const { queryParams, searchParams } = useRouterStuff();

  const sortBy = searchParams.get("sort") || "timestamp";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
  } = useSaleFilters({ event: "sales", interval: "30d", sortBy, order });

  const { data: analyticsData, error: analyticsError } = useSWR<{
    sales: number;
  }>(
    `/api/programs/${programId}/analytics?${searchQuery}&groupBy=count`,
    fetcher,
  );

  const totalSalesCount = analyticsData?.sales ?? 0;

  const { data: sales, error } = useSWR<
    z.infer<typeof saleEventResponseSchema>[]
  >(`/api/programs/${programId}/events?${searchQuery}`, fetcher);

  const loading = (!sales || !analyticsData) && !error && !analyticsError;

  const { pagination, setPagination } = usePagination();

  const table = useTable({
    data: sales || [],
    columns: [
      {
        id: "timestamp",
        header: "Date",
        accessorFn: (d) => formatDate(d.timestamp, { month: "short" }),
      },
      {
        header: "Customer",
        cell: ({ row }) => {
          const customer = row.original.customer;
          const display =
            customer.name || customer.email || generateRandomName();
          return (
            <Tooltip
              content={
                <div className="w-full p-3">
                  <Avatar
                    user={{
                      name: customer.name,
                      email: customer.email,
                      image: customer.avatar,
                    }}
                    className="h-8 w-8"
                  />
                  <p className="mt-2 text-sm font-semibold text-gray-700">
                    {display}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <p>{customer.email}</p>
                    <CopyButton
                      value={customer.email}
                      variant="neutral"
                      className="p-1 [&>*]:h-3 [&>*]:w-3"
                      successMessage="Copied email to clipboard!"
                    />
                  </div>
                </div>
              }
            >
              <div className="flex items-center gap-3" title={display}>
                <img
                  alt={display}
                  src={customer.avatar}
                  className="size-4 shrink-0 rounded-full border border-gray-200"
                />
                <span className="truncate">{display}</span>
              </div>
            </Tooltip>
          );
        },
      },
      {
        header: "Partner",
        accessorFn: () => "-",
      },
      {
        header: "Amount",
        accessorFn: (d) =>
          currencyFormatter(d.saleAmount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    sortableColumns: ["timestamp"],
    sortBy,
    sortOrder: order,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sort: sortBy }),
          ...(sortOrder && { order: sortOrder }),
        },
      }),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `sale${p ? "s" : ""}`,
    rowCount: Math.max(totalSalesCount, sales?.length ?? 0),
    loading,
    error: error || analyticsError ? "Failed to load sales" : undefined,
  });

  return loading || sales?.length ? (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {loading ? (
            <>
              <div className="h-10 w-full animate-pulse rounded-md bg-neutral-200 md:w-24" />
              <div className="h-10 w-full animate-pulse rounded-md bg-neutral-200 md:w-32" />
            </>
          ) : (
            <>
              <Filter.Select
                className="w-full md:w-fit"
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
              />
              <SearchBoxPersisted />
            </>
          )}
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
      <Table {...table} />
    </div>
  ) : (
    <AnimatedEmptyState
      title="No sales found"
      description="No sales have been made for this program yet."
      cardContent={() => (
        <>
          <MoneyBill2 className="size-4 text-neutral-700" />
          <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
        </>
      )}
    />
  );
}
