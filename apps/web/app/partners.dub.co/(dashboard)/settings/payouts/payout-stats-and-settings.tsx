"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PayoutMethod, PayoutsCount } from "@/lib/types";
import PayoutConnectButton from "@/ui/partners/payout-connect-button";
import { AlertCircleFill } from "@/ui/shared/icons";
import { PayoutStatus } from "@dub/prisma/client";
import { MatrixLines, Tooltip } from "@dub/ui";
import { fetcher } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Stripe } from "stripe";
import useSWR from "swr";

const PAYOUT_METHOD_LABELS = {
  stripe: "Stripe",
  paypal: "PayPal",
};

export function PayoutStatsAndSettings() {
  const { partner } = usePartnerProfile();
  const { payoutsCount } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const { data: bankAccount } = useSWR<Stripe.BankAccount>(
    partner &&
      partner.payoutMethod === "stripe" &&
      "/api/partner-profile/payouts/settings",
    fetcher,
  );

  return (
    <div className="grid grid-cols-1 divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-50 max-sm:divide-y sm:grid-cols-2 sm:divide-x">
      <div className="flex flex-col gap-1.5 p-4">
        <div className="flex justify-between gap-5">
          <div className="p-1">
            <div className="text-sm text-neutral-500">Upcoming payouts</div>
          </div>
          <PayoutConnectButton
            provider={partner?.payoutMethod as PayoutMethod}
            text={
              partner?.payoutsEnabledAt ? "Payout settings" : "Connect payouts"
            }
            className="h-8 w-fit px-3"
            variant={partner?.payoutsEnabledAt ? "secondary" : "primary"}
          />
        </div>
        <div className="flex items-end justify-between gap-5">
          <div className="mt-2 flex items-center gap-2">
            {!partner.payoutsEnabledAt && (
              <Tooltip
                content={`A ${
                  partner?.supportedPayoutMethod
                    ? PAYOUT_METHOD_LABELS[partner.supportedPayoutMethod]
                    : ""
                } connection is required for payouts.`}
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

          {partner.payoutMethod === "stripe" &&
            bankAccount &&
            Object.keys(bankAccount).length > 0 && (
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

          {partner.payoutMethod === "paypal" && partner.paypalEmail && (
            <div className="text-right text-sm">
              <p className="text-neutral-600">PayPal Account</p>
              <div className="flex items-center justify-end gap-1.5 font-mono text-neutral-400">
                {partner.paypalEmail.replace(/(?<=^.).+(?=.@)/, "********")}
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
