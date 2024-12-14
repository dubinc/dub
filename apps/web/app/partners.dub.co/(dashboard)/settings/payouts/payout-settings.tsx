"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import StripeConnectButton from "@/ui/partners/stripe-connect-button";
import NumberFlow from "@number-flow/react";
import { PayoutStatus } from "@prisma/client";

export function PayoutSettings() {
  const { partner } = usePartnerProfile();
  const { payoutsCount } = usePartnerPayoutsCount();

  return (
    <div className="grid grid-cols-1 divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-50 max-sm:divide-y sm:grid-cols-2 sm:divide-x">
      <div className="flex flex-col p-4">
        <div className="flex justify-between gap-5">
          <div className="p-1">
            <div className="text-sm text-neutral-500">Upcoming payouts</div>
          </div>
          <StripeConnectButton
            text={
              partner?.payoutsEnabled ? "Payout settings" : "Connect payouts"
            }
            className="h-8 w-fit px-3"
            variant={partner?.payoutsEnabled ? "secondary" : "primary"}
          />
        </div>
        <NumberFlow
          className="mt-2 text-2xl text-neutral-800"
          value={
            (payoutsCount?.find((p) => p.status === PayoutStatus.pending)
              ?.amount ?? 0) / 100
          }
          format={{
            style: "currency",
            currency: "USD",
            // @ts-ignore – this is a valid option but TS is outdated
            trailingZeroDisplay: "stripIfInteger",
          }}
        />
      </div>

      <div className="flex flex-col p-4">
        <div className="flex justify-between gap-5">
          <div className="p-1">
            <div className="text-sm text-neutral-500">Total payouts</div>
          </div>
        </div>
        <NumberFlow
          className="mt-2 text-2xl text-neutral-800"
          value={
            (payoutsCount?.find((p) => p.status === PayoutStatus.completed)
              ?.amount ?? 0) / 100
          }
          format={{
            style: "currency",
            currency: "USD",
            // @ts-ignore – this is a valid option but TS is outdated
            trailingZeroDisplay: "stripIfInteger",
          }}
        />
      </div>
    </div>
  );
}
