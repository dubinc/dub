"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PayoutsCount } from "@/lib/types";
import { ConnectPayoutButton } from "@/ui/partners/connect-payout-button";
import { PayoutMethodsDropdown } from "@/ui/partners/payout-methods-dropdown";
import { AlertCircleFill } from "@/ui/shared/icons";
import { PayoutStatus } from "@dub/prisma/client";
import { Tooltip } from "@dub/ui";
import NumberFlow from "@number-flow/react";

export function PayoutStatsAndSettings() {
  const { partner } = usePartnerProfile();
  const { payoutsCount } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  return (
    <div className="grid grid-cols-1 divide-neutral-200 rounded-lg border border-neutral-200 max-sm:divide-y sm:grid-cols-2 sm:divide-x">
      <div className="flex flex-col gap-1.5 p-4">
        <div className="flex justify-between gap-5">
          <div className="p-1">
            <div className="text-sm text-neutral-500">Upcoming payouts</div>
          </div>
          {partner && !partner.payoutsEnabledAt && (
            <ConnectPayoutButton className="h-8 w-fit px-3" />
          )}
        </div>
        <div className="flex items-end justify-between gap-5">
          <div className="mt-2 flex items-center gap-2">
            {partner && !partner.payoutsEnabledAt && (
              <Tooltip
                content="You need to connect your bank account to be able to receive payouts from the programs you are enrolled in."
                side="right"
              >
                <div>
                  <AlertCircleFill className="size-5 text-black" />
                </div>
              </Tooltip>
            )}

            <NumberFlow
              className="text-2xl text-neutral-800"
              value={
                (payoutsCount?.find((p) => p.status === PayoutStatus.pending)
                  ?.amount ?? 0) / 100
              }
              format={{
                style: "currency",
                currency: "USD",
              }}
            />
          </div>

          {partner?.payoutsEnabledAt && <PayoutMethodsDropdown />}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-4">
        <div className="flex justify-between gap-5">
          <div className="p-1">
            <div className="text-sm text-neutral-500">Total payouts</div>
          </div>
        </div>
        <NumberFlow
          className="mt-2 text-2xl text-neutral-800"
          value={
            (payoutsCount?.find(
              (p) =>
                p.status === PayoutStatus.completed ||
                p.status === PayoutStatus.processing,
            )?.amount ?? 0) / 100
          }
          format={{
            style: "currency",
            currency: "USD",
          }}
        />
      </div>
    </div>
  );
}
