"use client";

import usePayoutsCount from "@/lib/swr/use-payouts-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutsCount } from "@/lib/types";
import { usePayoutInvoiceSheet } from "@/ui/partners/payout-invoice-sheet";
import { PayoutStatus } from "@dub/prisma/client";
import { Button, buttonVariants } from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils";
import Link from "next/link";

export function PayoutStats() {
  const { slug } = useWorkspace();
  const { payoutInvoiceSheet, setIsOpen } = usePayoutInvoiceSheet();

  const { payoutsCount, loading } = usePayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const pendingPayouts = payoutsCount?.find(
    (p) => p.status === PayoutStatus.pending,
  );

  const totalPaid = payoutsCount?.find(
    (p) => p.status === PayoutStatus.completed,
  );

  const confirmButtonDisabled = pendingPayouts?.amount === 0;

  return (
    <>
      {payoutInvoiceSheet}
      <div className="grid grid-cols-1 divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-50 max-sm:divide-y sm:grid-cols-2 sm:divide-x">
        <div className="flex flex-col p-4">
          <div className="flex justify-between gap-5">
            <div className="p-1">
              <div className="text-sm text-neutral-500">Pending payouts</div>
            </div>
            <Button
              text="Confirm payouts"
              className="h-7 w-fit px-2"
              onClick={() => setIsOpen(true)}
              disabled={confirmButtonDisabled}
              disabledTooltip={
                confirmButtonDisabled
                  ? "You have no pending payouts."
                  : undefined
              }
            />
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
            <Link
              href={`/${slug}/settings/billing/invoices`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-7 items-center rounded-md border px-2 text-sm",
              )}
            >
              View invoices
            </Link>
          </div>
          <div className="mt-2 text-2xl text-neutral-800">
            {loading ? (
              <div className="h-8 w-32 animate-pulse rounded bg-neutral-200" />
            ) : (
              currencyFormatter(
                totalPaid?.amount ? totalPaid.amount / 100 : 0,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              ) + " USD"
            )}
          </div>
        </div>
      </div>
    </>
  );
}
