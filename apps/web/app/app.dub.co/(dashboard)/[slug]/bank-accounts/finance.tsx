import { CreditCard } from "lucide-react";

export const Finance = async ({ workspaceSlug }: { workspaceSlug: string }) => {
  return (
    <>
      <div className="flex items-center gap-5 rounded-lg border bg-white p-5">
        <div className="hidden h-12 w-12 items-center justify-center rounded-full border border-neutral-300 sm:inline-flex">
          <CreditCard className="h-5 w-5 text-gray-600" />
        </div>

        <div className="flex grow flex-col gap-1">
          <div className="text-base font-semibold text-gray-700">Wallet</div>
          <div className="text-sm text-neutral-500">
            Wallet balance and transaction history.
          </div>
        </div>
      </div>
    </>
  );
};
