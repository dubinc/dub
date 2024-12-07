"use client";

import { PartnerSaleResponse } from "@/lib/types";
import { SaleStatusBadges } from "@/ui/partners/sale-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CircleDollar } from "@dub/ui/src/icons";
import { currencyFormatter, fetcher, formatDate } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

export function SaleTablePartner({ limit }: { limit?: number }) {
  const partnerId = "pn_DlsZeePb38RVcnrfbD0SrKzB";
  const { programSlug } = useParams();
  const { queryParams, searchParamsObj, getQueryString } = useRouterStuff();

  const { sortBy = "timestamp", order = "desc" } = searchParamsObj as {
    sortBy?: "timestamp";
    order?: "asc" | "desc";
  };

  const { data: salesCount } = useSWR<{ count: number }>(
    partnerId &&
      programSlug &&
      `/api/partners/${partnerId}/programs/${programSlug}/sales/count${getQueryString()}`,
    fetcher,
  );

  const {
    data: sales,
    isLoading,
    error,
  } = useSWR<PartnerSaleResponse[]>(
    partnerId &&
      programSlug &&
      `/api/partners/${partnerId}/programs/${programSlug}/sales${getQueryString()}`,
    fetcher,
  );

  const { pagination, setPagination } = usePagination(limit);

  const { table, ...tableProps } = useTable({
    data: sales?.slice(0, limit) || [],
    loading: isLoading,
    error: error ? "Failed to fetch sales events." : undefined,
    columns: [
      {
        id: "timestamp",
        header: "Date",
        accessorKey: "timestamp",
        cell: ({ row }) => {
          return formatDate(row.original.createdAt, { month: "short" });
        },
      },
      {
        id: "customer",
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row }) => {
          return row.original.customer.email;
        },
      },
      {
        id: "saleAmount",
        header: "Sale Amount",
        accessorKey: "sale",
        cell: ({ row }) => {
          return currencyFormatter(row.original.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
      },
      {
        id: "earnings",
        header: "Earnings",
        accessorKey: "earnings",
        cell: ({ row }) => {
          return currencyFormatter(row.original.earnings / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
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
    ],
    ...(!limit && {
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
    }),
    rowCount: salesCount?.count || 0,
    emptyState: (
      <AnimatedEmptyState
        title="No sales found"
        description="No sales have been made for this program yet."
        cardContent={() => (
          <>
            <CircleDollar className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
          </>
        )}
      />
    ),
    resourceName: (plural) => `sale${plural ? "s" : ""}`,
  });

  return (
    <div className="flex flex-col gap-3">
      {!limit && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SimpleDateRangePicker className="w-full sm:min-w-[200px] md:w-fit" />
        </div>
      )}
      {isLoading || sales?.length ? (
        <Table
          {...tableProps}
          table={table}
          containerClassName="border-neutral-300"
        />
      ) : (
        <AnimatedEmptyState
          title="No sales found"
          description="No sales have been made for this program yet."
          cardContent={() => (
            <>
              <CircleDollar className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}
