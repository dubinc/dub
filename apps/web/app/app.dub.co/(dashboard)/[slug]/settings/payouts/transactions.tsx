"use client";

import { DotsTransactions } from "@/lib/dots/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { Table, useTable } from "@dub/ui";
import {
  capitalize,
  currencyFormatter,
  fetcher,
  formatDateTime,
} from "@dub/utils";
import useSWR from "swr";

export const Transactions = () => {
  const { id: workspaceId } = useWorkspace();

  const { data, error } = useSWR<DotsTransactions>(
    `/api/dots/transactions?workspaceId=${workspaceId}`,
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
        accessorFn: (row) => capitalize(row.type),
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
