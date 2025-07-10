"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PayoutsCount } from "@/lib/types";
import { ConnectPayoutButton } from "@/ui/partners/connect-payout-button";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { AlertCircleFill } from "@/ui/shared/icons";
import { PayoutStatus } from "@dub/prisma/client";
import { Tooltip } from "@dub/ui";
import {
  cn,
  CONNECT_SUPPORTED_COUNTRIES,
  currencyFormatter,
  PAYPAL_SUPPORTED_COUNTRIES,
} from "@dub/utils";
import { HelpCircle } from "lucide-react";
import { ReactNode } from "react";
import { usePartnerPayoutSettingsModal } from "./partner-payout-settings-modal";

const tooltips = {
  stripe: {
    pending:
      "Payouts that have passed the program’s holding period and are waiting to be processed.",
    processing:
      "Payouts that have been processed by the program and are on their way to your Stripe Express account.",
    sent: "Payouts that have been sent to your Stripe Express account and will be automatically paid out once they reach your minimum withdrawal balance.",
    completed:
      "Payouts that have been paid out from Stripe to your connected bank account.",
  },
  paypal: {
    pending:
      "Payouts that have passed the program’s holding period and are waiting to be processed.",
    processing:
      "Payouts that have been processed by the program and are on their way to your PayPal account.",
    sent: "",
    completed: "Payouts that have been paid out to your PayPal account",
  },
} as const;

function PayoutStatsCard({
  label,
  amount,
  icon: Icon,
  iconClassName,
  tooltip,
  sublabel,
  error,
  showConnectButton,
}: {
  label: string;
  amount: number;
  icon: any;
  iconClassName?: string;
  tooltip?: string;
  sublabel?: () => ReactNode;
  error?: boolean;
  showConnectButton?: boolean;
}) {
  const { partner } = usePartnerProfile();

  const isLoading = amount === undefined || error;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-6 items-center justify-center rounded-md",
            iconClassName,
          )}
        >
          <Icon className="size-4" />
        </div>

        <span className="text-xs font-medium leading-3 text-neutral-500">
          {label}
        </span>

        {tooltip && (
          <Tooltip content={tooltip} side="top">
            <div>
              <HelpCircle className="size-3.5 text-neutral-500" />
            </div>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isLoading ? (
            <div className="flex items-center gap-2">
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

              <span className="h-7 text-base font-medium leading-6 text-neutral-800 sm:text-xl sm:leading-7">
                {error ? (
                  "-"
                ) : (
                  <>
                    {amount > 0
                      ? currencyFormatter(amount / 100, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "$0.00"}
                  </>
                )}
              </span>

              {sublabel && (
                <span className="items-center gap-6 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium leading-4 text-neutral-700">
                  {sublabel()}
                </span>
              )}
            </div>
          ) : (
            <div className="h-7 w-20 animate-pulse rounded bg-neutral-200 sm:h-7 sm:w-24" />
          )}
        </div>

        {showConnectButton && (
          <ConnectPayoutButton
            className="h-8 w-fit rounded-lg px-2.5 py-2"
            text="Connect payouts"
          />
        )}
      </div>
    </div>
  );
}

export function PayoutStats() {
  const { partner } = usePartnerProfile();

  const { payoutsCount, error } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const { PartnerPayoutSettingsModal, setShowPartnerPayoutSettingsModal } =
    usePartnerPayoutSettingsModal();

  const payoutStatusMap = Object.fromEntries(
    payoutsCount?.map((p) => [p.status, p]) || [],
  ) as Record<PayoutStatus, PayoutsCount>;

  let payoutMethod: "stripe" | "paypal" | undefined = undefined;

  if (partner?.country) {
    if (PAYPAL_SUPPORTED_COUNTRIES.includes(partner.country)) {
      payoutMethod = "paypal";
    } else if (CONNECT_SUPPORTED_COUNTRIES.includes(partner.country)) {
      payoutMethod = "stripe";
    }
  }

  const tooltip = payoutMethod ? tooltips[payoutMethod] : undefined;

  const payoutStats = [
    {
      label: "Pending",
      amount: payoutStatusMap?.pending?.amount,
      icon: PayoutStatusBadges.pending.icon,
      iconClassName: "bg-orange-100 text-orange-500",
      tooltip: tooltip?.pending,
      error: !!error,
      showConnectButton: partner && !partner.payoutsEnabledAt,
    },

    {
      label: "Processing",
      amount: payoutStatusMap?.processing?.amount,
      icon: PayoutStatusBadges.processing.icon,
      iconClassName: "bg-blue-100 text-blue-500",
      tooltip: tooltip?.processing,
      error: !!error,
    },

    ...(payoutMethod === "stripe"
      ? [
          {
            label: "Sent",
            amount: payoutStatusMap?.sent?.amount,
            icon: PayoutStatusBadges.sent.icon,
            iconClassName: "bg-indigo-100 text-indigo-500",
            tooltip: tooltip?.sent,
            error: !!error,
            sublabel: () => {
              if (!partner || !payoutsCount || error) {
                return null;
              }

              const amount = payoutStatusMap.sent.amount;

              if (amount < partner.minWithdrawalAmount) {
                return (
                  <button
                    onClick={() => setShowPartnerPayoutSettingsModal(true)}
                    title="Update minimum withdrawal amount"
                  >
                    {currencyFormatter(partner.minWithdrawalAmount / 100)}{" "}
                    minimum
                  </button>
                );
              }

              return "Est: 4 business days";
            },
          },
        ]
      : []),

    {
      label: "Completed",
      amount: payoutStatusMap?.completed?.amount,
      icon: PayoutStatusBadges.completed.icon,
      iconClassName: "bg-green-100 text-green-500",
      tooltip: tooltip?.completed,
      error: !!error,
    },
  ];

  return (
    <>
      <PartnerPayoutSettingsModal />
      <div
        className={cn(
          "grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200",
          payoutMethod === "stripe"
            ? "grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        )}
      >
        {payoutStats.map((stat) => (
          <PayoutStatsCard key={stat.label} {...stat} />
        ))}
      </div>
    </>
  );
}
