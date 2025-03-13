"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PayoutsCount } from "@/lib/types";
import StripeConnectButton from "@/ui/partners/stripe-connect-button";
import { AlertCircleFill } from "@/ui/shared/icons";
import { PayoutStatus } from "@dub/prisma/client";
import { AnimatedSizeContainer, MoneyBills2, Tooltip } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function PayoutStats() {
  const { partner } = usePartnerProfile();
  const { payoutsCount } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  return (
    <AnimatedSizeContainer height>
      <div className="border-t border-neutral-300/80 p-3">
        <Link
          className="group flex items-center gap-1.5 text-sm font-normal text-neutral-500 transition-colors hover:text-neutral-700"
          href="/settings/payouts"
        >
          <MoneyBills2 className="size-4" />
          Payouts
          <ChevronRight className="size-3 text-neutral-400 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-neutral-500" />
        </Link>

        <div className="mt-4 flex flex-col gap-2">
          <div className="grid gap-1 text-sm">
            <p className="text-neutral-500">Upcoming payouts</p>
            <div className="flex items-center gap-2">
              {partner && !partner.payoutsEnabledAt && (
                <Tooltip
                  content="You need to set up your Stripe payouts account to be able to receive payouts from the programs you are enrolled in."
                  side="right"
                >
                  <div>
                    <AlertCircleFill className="size-4 text-black" />
                  </div>
                </Tooltip>
              )}
              {payoutsCount ? (
                <p className="text-black">
                  {currencyFormatter(
                    (payoutsCount?.find(
                      (payout) => payout.status === PayoutStatus.pending,
                    )?.amount || 0) / 100,
                    {
                      maximumFractionDigits: 2,
                    },
                  )}
                </p>
              ) : (
                <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-200" />
              )}
            </div>
          </div>
          <div className="grid gap-1 text-sm">
            <p className="text-neutral-500">Total payouts</p>
            {payoutsCount ? (
              <p className="text-black">
                {currencyFormatter(
                  (payoutsCount?.find(
                    (payout) => payout.status === PayoutStatus.completed,
                  )?.amount || 0) / 100,
                  {
                    maximumFractionDigits: 2,
                  },
                )}
              </p>
            ) : (
              <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
        {partner && !partner.payoutsEnabledAt && (
          <StripeConnectButton
            className="mt-4 h-9 w-full"
            text="Connect payouts"
          />
        )}
      </div>
    </AnimatedSizeContainer>
  );
}
