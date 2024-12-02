"use client";

import { DotsDeposits } from "@/lib/dots/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { PlatformBadge } from "@/ui/partners/platform-badge";
import { StatusBadge, Table, Tooltip, useTable } from "@dub/ui";
import {
  capitalize,
  currencyFormatter,
  fetcher,
  formatDateTime,
} from "@dub/utils";
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

export const WorkspaceDepositActivity = () => {
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<DotsDeposits>(
    `/api/workspaces/${workspaceId}/deposits`,
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
        header: "Status",
        cell: ({ row }) => {
          const badge = (
            <StatusBadge variant={StatusBadgeVariants[row.original.status]}>
              {capitalize(row.original.status)}
            </StatusBadge>
          );

          if (row.original.status === "pending") {
            return (
              <Tooltip content="Deposits can take 3 to 5 business days to complete.">
                <div className="w-fit">{badge}</div>
              </Tooltip>
            );
          } else {
            return badge;
          }
        },
      },
    ],
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
  });

  return (
    <div>
      <h2 className="text-base font-semibold text-neutral-900">
        Recent deposits
      </h2>
      <div className="mt-3">
        <Table {...table} />
      </div>
    </div>
  );
};
