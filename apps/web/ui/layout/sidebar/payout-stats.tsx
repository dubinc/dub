"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PayoutsCount } from "@/lib/types";
import { ConnectPayoutButton } from "@/ui/partners/connect-payout-button";
import { AlertCircleFill } from "@/ui/shared/icons";
import { PayoutStatus } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  ChevronRight,
  MoneyBills2,
  SimpleTooltipContent,
  Tooltip,
} from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import Link from "next/link";
import { memo } from "react";

export const PayoutStats = memo(() => {
  const { partner } = usePartnerProfile();
  const { payoutsCount } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  return (
    <AnimatedSizeContainer height>
      <div className="border-border-default rounded-lg border p-2 pt-1">
        <Link
          className="group flex items-center justify-between gap-2 px-2 py-2"
          href="/settings/payouts"
        >
          <div className="text-content-emphasis flex items-center gap-2 text-sm font-semibold">
            <MoneyBills2 className="size-4" />
            Payouts
          </div>
          <ChevronRight className="text-content-muted group-hover:text-content-default size-3 transition-[color,transform] group-hover:translate-x-0.5 [&_*]:stroke-2" />
        </Link>

        <div className="mt-2 flex flex-col gap-4 px-2">
          <div className="grid gap-1 text-xs">
            <p className="text-content-subtle font-medium">Upcoming payouts</p>
            <div className="flex items-center gap-1">
              {partner && !partner.payoutsEnabledAt && (
                <Tooltip
                  content={
                    <SimpleTooltipContent
                      title="You need to connect your bank account to be able to receive payouts from the programs you are enrolled in."
                      cta="Learn more"
                      href="https://dub.co/help/article/receiving-payouts"
                    />
                  }
                  side="right"
                >
                  <div>
                    <AlertCircleFill className="text-content-default size-3" />
                  </div>
                </Tooltip>
              )}
              {payoutsCount ? (
                <p className="text-content-default font-medium">
                  {currencyFormatter(
                    (payoutsCount
                      ?.filter(
                        (payout) =>
                          payout.status === PayoutStatus.pending ||
                          payout.status === PayoutStatus.processing,
                      )
                      ?.reduce((acc, p) => acc + p.amount, 0) || 0) / 100,
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
          <div className="grid gap-1 text-xs">
            <p className="text-content-subtle font-medium">Received payouts</p>
            {payoutsCount ? (
              <p className="text-content-default font-medium">
                {currencyFormatter(
                  (payoutsCount
                    ?.filter(
                      (payout) =>
                        payout.status === PayoutStatus.processed ||
                        payout.status === PayoutStatus.sent ||
                        payout.status === PayoutStatus.completed,
                    )
                    ?.reduce((acc, p) => acc + p.amount, 0) ?? 0) / 100,
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
          <ConnectPayoutButton className="mt-4 h-8 w-full" />
        )}
      </div>
    </AnimatedSizeContainer>
  );
});
