import { SALES_PAGE_SIZE } from "@/lib/partners/constants";
import { PartnerSaleResponse } from "@/lib/types";
import { Gift, Table, usePagination, useTable } from "@dub/ui";
import {
  currencyFormatter,
  fetcher,
  formatDate,
  formatDateTime,
  TAB_ITEM_ANIMATION_SETTINGS,
} from "@dub/utils";

import { motion } from "framer-motion";
import useSWR from "swr";
export function EmbedSales({ salesCount }: { salesCount: number }) {
  const { pagination, setPagination } = usePagination(SALES_PAGE_SIZE);
  const { data: sales, isLoading } = useSWR<PartnerSaleResponse[]>(
    `/api/embed/sales?page=${pagination.pageIndex}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { table, ...tableProps } = useTable({
    data: sales || [],
    loading: isLoading,
    columns: [
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => {
          return row.original.customer.email;
        },
      },
      {
        id: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <p title={formatDateTime(row.original.createdAt)}>
            {formatDate(row.original.createdAt, { month: "short" })}
          </p>
        ),
      },
      {
        id: "saleAmount",
        header: "Amount",
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
    ],
    pagination,
    onPaginationChange: setPagination,
    rowCount: salesCount,
    emptyState: (
      <div className="flex w-full flex-col items-center justify-center gap-2">
        <Gift className="size-6 text-neutral-400" />
        <p className="max-w-sm text-balance text-center text-xs text-neutral-400">
          No sales yet. When you refer a friend and they make a purchase,
          they'll show up here.
        </p>
      </div>
    ),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (plural) => `sale${plural ? "s" : ""}`,
  });

  return (
    <motion.div {...TAB_ITEM_ANIMATION_SETTINGS}>
      <Table
        {...tableProps}
        table={table}
        containerClassName="rounded-md border border-neutral-200"
        scrollWrapperClassName="min-h-[22rem]"
      />
    </motion.div>
  );
}
