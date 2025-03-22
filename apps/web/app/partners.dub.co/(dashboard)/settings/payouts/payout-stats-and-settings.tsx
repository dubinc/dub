"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PayoutsCount } from "@/lib/types";
import StripeConnectButton from "@/ui/partners/stripe-connect-button";
import { PayoutStatus } from "@dub/prisma/client";
import { MatrixLines } from "@dub/ui";
import { CONNECT_SUPPORTED_COUNTRIES, COUNTRIES, fetcher } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Stripe } from "stripe";
import useSWR from "swr";

export function PayoutStatsAndSettings() {
  const { partner } = usePartnerProfile();
  const { payoutsCount } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const { data: bankAccount } = useSWR<Stripe.BankAccount | null>(
    partner && `/api/partner-profile/payouts/settings`,
    fetcher,
  );

  return (
    <div className="grid grid-cols-1 divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-50 max-sm:divide-y sm:grid-cols-2 sm:divide-x">
      <div className="flex flex-col gap-1.5 p-4">
        <div className="flex justify-between gap-5">
          <div className="p-1">
            <div className="text-sm text-neutral-500">Upcoming payouts</div>
          </div>
          <StripeConnectButton
            text={
              partner?.payoutsEnabledAt ? "Payout settings" : "Connect payouts"
            }
            className="h-8 w-fit px-3"
            variant={partner?.payoutsEnabledAt ? "secondary" : "primary"}
            disabledTooltip={
              partner?.country &&
              !CONNECT_SUPPORTED_COUNTRIES.includes(partner.country) &&
              `We currently do not support payouts for ${COUNTRIES[partner.country]} yet, but we are working on adding support for more countries soon.`
            }
          />
        </div>
        <div className="flex items-end justify-between gap-5">
          <NumberFlow
            className="mt-2 text-2xl text-neutral-800"
            value={
              (payoutsCount?.find((p) => p.status === PayoutStatus.pending)
                ?.amount ?? 0) / 100
            }
            format={{
              style: "currency",
              currency: "USD",
            }}
          />
          {bankAccount && (
            <div className="text-sm">
              <p className="text-neutral-600">{bankAccount.bank_name}</p>
              <div className="flex items-center gap-1.5 font-mono text-neutral-400">
                <MatrixLines className="size-3" />
                {bankAccount.routing_number}
                <MatrixLines className="size-3" />
                ••••{bankAccount.last4}
              </div>
            </div>
          )}
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
            (payoutsCount?.find((p) => p.status === PayoutStatus.completed)
              ?.amount ?? 0) / 100
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
