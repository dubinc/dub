"use client";

import usePayoutsCount from "@/lib/swr/use-payouts-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutsCount } from "@/lib/types";
import { usePayoutInvoiceSheet } from "@/ui/partners/payout-invoice-sheet";
import { PayoutStatus } from "@dub/prisma/client";
import { Button, buttonVariants, Tooltip } from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils";
import Link from "next/link";

export function PayoutStats() {
  const { slug } = useWorkspace();
  const { payoutInvoiceSheet, setIsOpen } = usePayoutInvoiceSheet();

  const { payoutsCount, loading } = usePayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const {
    payoutsCount: eligiblePayoutsCount,
    loading: eligiblePayoutsLoading,
  } = usePayoutsCount<PayoutsCount[]>({
    groupBy: "status",
    eligibility: "eligible",
  });

  const allPendingPayouts = payoutsCount?.find(
    (p) => p.status === PayoutStatus.pending,
  );

  const eligiblePendingPayouts = eligiblePayoutsCount?.find(
    (p) => p.status === PayoutStatus.pending,
  );

  const pendingIneligiblePayouts =
    typeof allPendingPayouts?.amount === "number" &&
    typeof eligiblePendingPayouts?.amount === "number" &&
    allPendingPayouts.amount - eligiblePendingPayouts.amount;

  const confirmButtonDisabled = eligiblePendingPayouts?.amount === 0;

  const completedPayouts = payoutsCount?.find(
    (p) => p.status === PayoutStatus.completed,
  );

  const processingPayouts = payoutsCount?.find(
    (p) => p.status === PayoutStatus.processing,
  );

  const totalPaid =
    (completedPayouts?.amount || 0) + (processingPayouts?.amount || 0);

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
              disabled={eligiblePayoutsLoading || confirmButtonDisabled}
              disabledTooltip={
                confirmButtonDisabled
                  ? "You have no pending payouts that match the minimum payout requirement for partners that have payouts enabled."
                  : undefined
              }
            />
          </div>
          <div
            className={cn(
              "mt-2 text-2xl text-neutral-800",
              pendingIneligiblePayouts &&
                "underline decoration-dotted underline-offset-2",
            )}
          >
            {loading || eligiblePayoutsLoading ? (
              <div className="h-8 w-32 animate-pulse rounded bg-neutral-200" />
            ) : (
              <Tooltip
                content={
                  <div className="w-64">
                    <div className="border-b border-neutral-200 p-3 text-sm font-medium text-neutral-700">
                      Pending payouts
                    </div>
                    <div className="grid gap-1 p-3">
                      {[
                        {
                          display: "Eligible payouts",
                          amount: eligiblePendingPayouts?.amount || 0,
                        },
                        {
                          display: "Ineligible payouts",
                          amount: pendingIneligiblePayouts || 0,
                        },
                      ].map(({ display, amount }, index) => (
                        <div className="flex justify-between" key={index}>
                          <div className="text-sm text-neutral-500">
                            {display}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {currencyFormatter(amount / 100, {
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                }
              >
                <span className="underline decoration-dotted underline-offset-2">
                  {currencyFormatter(
                    eligiblePendingPayouts?.amount
                      ? eligiblePendingPayouts.amount / 100
                      : 0,
                    {
                      maximumFractionDigits: 2,
                    },
                  ) + " USD"}
                </span>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="flex flex-col p-4">
          <div className="flex justify-between gap-5">
            <div className="p-1">
              <div className="text-sm text-neutral-500">Total paid</div>
            </div>
            <Link
              href={`/${slug}/settings/billing/invoices?type=payout`}
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
              <Tooltip
                content={
                  <div className="w-64">
                    <div className="border-b border-neutral-200 p-3 text-sm font-medium text-neutral-700">
                      Total paid
                    </div>
                    <div className="grid gap-1 p-3">
                      {[
                        {
                          display: "Completed payouts",
                          amount: completedPayouts?.amount || 0,
                        },
                        {
                          display: "Processing payouts",
                          amount: processingPayouts?.amount || 0,
                        },
                      ].map(({ display, amount }, index) => (
                        <div className="flex justify-between" key={index}>
                          <div className="text-sm text-neutral-500">
                            {display}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {currencyFormatter(amount / 100, {
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                }
              >
                <span className="underline decoration-dotted underline-offset-2">
                  {currencyFormatter(totalPaid / 100, {
                    maximumFractionDigits: 2,
                  }) + " USD"}
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
