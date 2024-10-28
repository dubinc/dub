"use client";

import { DotsTransactions } from "@/lib/dots/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export const Transactions = () => {
  const { id: workspaceId } = useWorkspace();

  const { data, isLoading } = useSWR<DotsTransactions>(
    `/api/dots/transactions?workspaceId=${workspaceId}`,
    fetcher,
  );

  const transactions = data?.data || [];

  return (
    <ul className="flex w-full flex-col space-y-2">
      {transactions.map((transaction) => (
        <li
          key={transaction.id}
          className="flex items-center justify-between rounded-lg bg-white p-3 shadow transition-colors hover:bg-gray-50"
        >
          <span>{transaction.created}</span>
          <span>{transaction.source_name}</span>
          <span>{transaction.destination_name}</span>
          <span>${Number(transaction.amount).toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
};
