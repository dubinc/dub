import { REFERRALS_EMBED_EARNINGS_LIMIT } from "@/lib/partners/constants";
import { PartnerEarningsResponse } from "@/lib/types";
import { CommissionStatusBadges } from "@/ui/partners/commission-status-badges";
import { Gift, StatusBadge, Table, usePagination, useTable } from "@dub/ui";
import {
  currencyFormatter,
  fetcher,
  formatDate,
  formatDateTime,
  TAB_ITEM_ANIMATION_SETTINGS,
} from "@dub/utils";
import { motion } from "framer-motion";
import useSWR from "swr";
import { useEmbedToken } from "../../embed/use-embed-token";

export function ReferralsEmbedEarnings({ salesCount }: { salesCount: number }) {
  const token = useEmbedToken();

  const { pagination, setPagination } = usePagination(
    REFERRALS_EMBED_EARNINGS_LIMIT,
  );
  const { data: earnings, isLoading } = useSWR<PartnerEarningsResponse[]>(
    `/api/embed/referrals/earnings?page=${pagination.pageIndex}`,
    (url) =>
      fetcher(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    {
      keepPreviousData: true,
    },
  );

  const { table, ...tableProps } = useTable({
    data: earnings || [],
    loading: isLoading,
    columns: [
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => {
          return row.original.customer ? row.original.customer.email : "-";
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
        id: "amount",
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
    ],
    pagination,
    onPaginationChange: setPagination,
    rowCount: salesCount,
    emptyState: (
      <div className="flex w-full flex-col items-center justify-center gap-2">
        <Gift className="text-content-muted size-6" />
        <p className="text-content-muted max-w-sm text-balance text-center text-xs">
          No earnings yet. When you refer a friend and they make a purchase,
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
        containerClassName="rounded-md border border-border-subtle"
        scrollWrapperClassName="min-h-[22rem]"
      />
    </motion.div>
  );
}
