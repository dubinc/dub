"use client";

import useDotsApp from "@/lib/swr/use-dots-app";
import useWorkspace from "@/lib/swr/use-workspace";
import { useDepositFundsModal } from "@/ui/modals/deposit-funds-modal";
import { Button } from "@dub/ui";
import { SimpleTooltipContent } from "@dub/ui/src/tooltip";
import { currencyFormatter } from "@dub/utils";

export const Wallet = () => {
  const { slug, bankAccountVerified } = useWorkspace();
  const { data, error } = useDotsApp();

  const loading = !data && !error;

  const { DepositFundsModal, setShowDepositFundsModal } =
    useDepositFundsModal();

  return (
    <>
      <DepositFundsModal />
      <div className="flex flex-col p-4">
        <div className="flex justify-between gap-5">
          <div className="p-1">
            <div className="text-sm text-neutral-500">Wallet</div>
          </div>

          <div>
            {bankAccountVerified !== undefined ? (
              <Button
                text="Deposit funds"
                onClick={() => setShowDepositFundsModal(true)}
                className="h-7 w-fit px-2"
                disabledTooltip={
                  !bankAccountVerified ? (
                    <SimpleTooltipContent
                      title="You can only deposit funds once your bank account is verified."
                      cta="Contact support."
                      href={
                        `mailto:support@dub.co?subject=Verifying payouts bank account` +
                        `&body=I am verifying bank account ownership for my workspace "${slug}".` +
                        ` I have attached a copy of my recent bank statement to this email.`
                      }
                    />
                  ) : undefined
                }
              />
            ) : (
              <div className="h-7 w-24 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
        <div className="mt-6 flex grow flex-col justify-end p-1">
          {loading ? (
            <div className="h-8 w-32 animate-pulse rounded bg-neutral-200" />
          ) : (
            <div className="text-2xl text-neutral-800">
              {currencyFormatter(
                parseFloat(data?.metrics.wallet_balance ?? "") / 100,
                { minimumFractionDigits: 2, maximumFractionDigits: 2 },
              )}{" "}
              USD
            </div>
          )}
        </div>
      </div>
    </>
  );
};
