"use client";

import { DotsApp } from "@/lib/dots/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { useDepositFundsModal } from "@/ui/modals/deposit-funds-modal";
import { Button } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { CreditCard } from "lucide-react";
import useSWR from "swr";

export const Wallet = () => {
  const workspace = useWorkspace();

  const { DepositFundsModal, setShowDepositFundsModal } =
    useDepositFundsModal();

  // TODO:
  // Move this to a hook
  const { data } = useSWR<DotsApp>(
    `/api/workspaces/${workspace.id}/dots-app`,
    fetcher,
  );

  return (
    <>
      <DepositFundsModal />
      <div className="flex items-center gap-5 rounded-lg border bg-white p-5">
        <div className="hidden h-12 w-12 items-center justify-center rounded-full border border-neutral-300 sm:inline-flex">
          <CreditCard className="h-5 w-5 text-gray-600" />
        </div>

        <div className="flex grow flex-col gap-1">
          <div className="text-base font-semibold text-gray-700">
            Wallet - ${data?.metrics.wallet_balance}
          </div>
          <div className="text-sm text-neutral-500">
            Wallet balance and transaction history.
          </div>
        </div>

        <div>
          <Button
            text="Deposit funds"
            onClick={() => setShowDepositFundsModal(true)}
          />
        </div>
      </div>
    </>
  );
};
