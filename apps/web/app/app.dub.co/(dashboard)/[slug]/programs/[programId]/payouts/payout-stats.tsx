"use client";

import usePayoutsCount from "@/lib/swr/use-payouts-count";
import { PayoutsCount } from "@/lib/types";
import { PayoutStatus } from "@dub/prisma/client";
import { Button } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";

export function PayoutStats() {
  const { payoutsCount, loading } = usePayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const pendingPayouts = payoutsCount?.find(
    (p) => p.status === PayoutStatus.pending,
  );

  const totalPaid = payoutsCount?.find(
    (p) => p.status === PayoutStatus.completed,
  );

  return (
    <div className="grid grid-cols-1 divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-50 max-sm:divide-y sm:grid-cols-2 sm:divide-x">
      <div className="flex flex-col p-4">
        <div className="flex justify-between gap-5">
          <div className="p-1">
            <div className="text-sm text-neutral-500">Pending payouts</div>
          </div>
          <Button text="Confirm payouts" className="h-7 w-fit px-2" />
        </div>
        <div className="mt-2 text-2xl text-neutral-800">
          {loading ? (
            <div className="h-8 w-32 animate-pulse rounded bg-neutral-200" />
          ) : (
            currencyFormatter(
              pendingPayouts?.amount ? pendingPayouts.amount / 100 : 0,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            ) + " USD"
          )}
        </div>
      </div>

      <div className="flex flex-col p-4">
        <div className="flex justify-between gap-5">
          <div className="p-1">
            <div className="text-sm text-neutral-500">Total paid</div>
          </div>
          <Button
            text="View invoices"
            className="h-7 w-fit px-2"
            variant="secondary"
          />
        </div>
        <div className="mt-2 text-2xl text-neutral-800">
          {loading ? (
            <div className="h-8 w-32 animate-pulse rounded bg-neutral-200" />
          ) : (
            currencyFormatter(totalPaid?.amount ? totalPaid.amount / 100 : 0, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + " USD"
          )}
        </div>
      </div>
    </div>
  );
}
