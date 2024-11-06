"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useAddBankAccountModal } from "@/ui/modals/add-bank-account-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Button } from "@dub/ui";
import { BadgeCheck, GreekTemple } from "@dub/ui/src/icons";
import { truncate } from "@dub/utils";
import { BankAccount } from "./bank-account";
import { ComplianceButton } from "./compliance-button";
import { Transactions } from "./transactions";
import { Wallet } from "./wallet";

export function PayoutsPageClient() {
  const {
    bankAccountName,
    bankAccountVerified,
    loading: isLoadingWorkspace,
  } = useWorkspace();

  const { AddBankAccountModal, setShowAddBankAccountModal } =
    useAddBankAccountModal();

  return (
    <>
      <AddBankAccountModal />
      {bankAccountName || isLoadingWorkspace ? (
        <div>
          <div className="rounded-lg border border-neutral-300 bg-white p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-5">
                <div className="hidden size-12 items-center justify-center rounded-full border border-neutral-300 sm:flex">
                  <GreekTemple className="size- 5text-neutral-900" />
                </div>
                <div className="flex flex-col gap-1">
                  {bankAccountName ? (
                    <span className="text-base font-medium leading-none text-neutral-900">
                      {truncate(bankAccountName, 32)}
                    </span>
                  ) : (
                    <div className="h-4 w-32 animate-pulse rounded-md bg-neutral-200" />
                  )}
                  {bankAccountVerified !== undefined ? (
                    <span className="text-sm leading-none text-neutral-500">
                      {bankAccountVerified ? "Connected" : "Verifying"}
                    </span>
                  ) : (
                    <div className="h-3.5 w-16 animate-pulse rounded-md bg-neutral-200" />
                  )}
                </div>
              </div>

              <ComplianceButton />
            </div>
            <div className="mt-5 grid divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-50 max-sm:divide-y sm:grid-cols-[repeat(2,minmax(0,1fr))] sm:divide-x">
              <Wallet />
              <BankAccount />
            </div>
          </div>
          <div className="mt-8">
            <Transactions />
          </div>
        </div>
      ) : (
        <AnimatedEmptyState
          title="Payouts"
          description="Connect financial accounts to authorize partner payouts"
          cardContent={() => (
            <>
              <GreekTemple className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-gray-500">
                <BadgeCheck className="size-3.5" />
              </div>
            </>
          )}
          addButton={
            <Button
              text="Connect bank account"
              onClick={() => setShowAddBankAccountModal(true)}
            />
          }
        />
      )}
    </>
  );
}
