"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useAddBankAccountModal } from "@/ui/modals/add-bank-account-modal";
import { Button, MaxWidthWrapper } from "@dub/ui";

export const BankAccountsClient = () => {
  const { bankAccountName, maskedAccountNumber } = useWorkspace();

  const { AddBankAccountModal, setShowAddBankAccountModal } =
    useAddBankAccountModal();

  return (
    <>
      <AddBankAccountModal />
      <div className="relative min-h-[calc(100vh-16px)]">
        <MaxWidthWrapper className="grid gap-5 pb-10 pt-3">
          <div className="flex items-center gap-5 rounded-lg border bg-white p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300">
              <div className="h-5 w-[41px]"></div>
            </div>

            <div className="flex grow flex-col gap-1">
              <div className="text-base font-semibold text-gray-700">
                {bankAccountName ?? "Add your bank account"}
              </div>
              <div className="text-sm text-neutral-500">
                {maskedAccountNumber
                  ? `*******${maskedAccountNumber}`
                  : "Add your bank account"}
              </div>
            </div>

            <div>
              {bankAccountName ? (
                <Button text="Disconnect" />
              ) : (
                <Button
                  text="Add bank account"
                  onClick={() => setShowAddBankAccountModal(true)}
                />
              )}
            </div>
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
};
