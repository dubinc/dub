"use client";

import { DotsWithdrawals } from "@/lib/dots/types";
import { PlatformBadge } from "@/ui/partners/platform-badge";
import { StatusBadge, Table, Tooltip, useTable } from "@dub/ui";
import {
  capitalize,
  currencyFormatter,
  fetcher,
  formatDateTime,
} from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";

const StatusBadgeVariants = {
  created: "new",
  pending: "pending",
  failed: "error",
  completed: "success",
  reversed: "error",
  canceled: "error",
  flagged: "warning",
};

export const PartnerWithdrawalsActivity = () => {
  const { partnerId } = useParams();

  const { data, error } = useSWR<DotsWithdrawals>(
    `/api/partners/${partnerId}/withdrawals`,
    fetcher,
  );

  const table = useTable({
    data: data?.data || [],
    loading: !data && !error,
    error: error ? "Failed to load recent activity" : undefined,
    emptyState: "No recent withdrawals",
    columns: [
      {
        header: "Date",
        accessorFn: (row) => formatDateTime(new Date(row.created), {}),
      },
      {
        header: "Method",
        cell: ({ row }) => <PlatformBadge platform={row.original.platform} />,
      },
      {
        header: "Amount",
        accessorFn: (row) =>
          currencyFormatter(parseFloat(row.amount) / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        header: "Fee",
        cell: ({ row }) =>
          row.original.fee === "0" ? (
            <Tooltip content="Since this withdrawal was above $1,000 and in the US, we covered the fee.">
              <span className="cursor-default truncate underline decoration-dotted">
                No fee
              </span>
            </Tooltip>
          ) : (
            currencyFormatter(parseFloat(row.original.fee) / 100, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge variant={StatusBadgeVariants[row.original.status]}>
            {capitalize(row.original.status)}
          </StatusBadge>
        ),
      },
    ],
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
  });

  return (
    <div>
      <h2 className="text-base font-semibold text-neutral-900">
        Recent withdrawals
      </h2>
      <div className="mt-3">
        <Table {...table} />
      </div>
    </div>
  );
};
