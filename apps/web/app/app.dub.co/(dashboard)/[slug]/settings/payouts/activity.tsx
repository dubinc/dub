"use client";

import { DotsTransfers } from "@/lib/dots/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { StatusBadge, Table, useTable } from "@dub/ui";
import {
  capitalize,
  currencyFormatter,
  fetcher,
  formatDateTime,
} from "@dub/utils";
import useSWR from "swr";

const TRANSACTION_TYPES = {
  refill: "Deposit",
  payout: "Withdrawal",
};

const StatusBadgeVariants = {
  created: "new",
  pending: "pending",
  failed: "error",
  completed: "success",
  reversed: "error",
  canceled: "error",
  flagged: "warning",
};

export const Activity = () => {
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<DotsTransfers>(
    `/api/dots/transfers?workspaceId=${workspaceId}`,
    fetcher,
  );

  const table = useTable({
    data: data?.data || [],
    loading: !data && !error,
    error: error ? "Failed to load recent activity" : undefined,
    columns: [
      {
        header: "Date",
        accessorFn: (row) => formatDateTime(new Date(row.created), {}),
      },
      {
        header: "Type",
        accessorFn: (row) =>
          capitalize(TRANSACTION_TYPES[row.type] ?? row.type),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge variant={StatusBadgeVariants[row.original.status]}>
            {capitalize(row.original.status)}
          </StatusBadge>
        ),
      },
      {
        header: "Amount",
        accessorFn: (row) =>
          currencyFormatter(parseFloat(row.amount) / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
  });

  return (
    <div>
      <h2 className="text-base font-semibold text-neutral-900">
        Recent activity
      </h2>
      <div className="mt-3">
        <Table {...table} />
      </div>
    </div>
  );
};
