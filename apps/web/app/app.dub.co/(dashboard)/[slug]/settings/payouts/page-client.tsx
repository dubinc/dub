"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useAddBankAccountModal } from "@/ui/modals/add-bank-account-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Button } from "@dub/ui";
import { BadgeCheck, GreekTemple } from "@dub/ui/src/icons";
import { BankAccount } from "./bank-account";
import { ComplianceFlow } from "./compliance-flow";
import { Transactions } from "./transactions";
import { Wallet } from "./wallet";

export function PayoutsPageClient() {
  const { bankAccountName, dotsAppId } = useWorkspace();

  const { AddBankAccountModal, setShowAddBankAccountModal } =
    useAddBankAccountModal();

  return (
    <>
      <AddBankAccountModal />
      {bankAccountName ? (
        <div className="relative grid gap-5 pb-10">
          <BankAccount />
          <ComplianceFlow />
          <Wallet />
          <Transactions />
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
