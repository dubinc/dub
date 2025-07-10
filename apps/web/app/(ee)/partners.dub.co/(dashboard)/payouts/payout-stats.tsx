"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PayoutsCount } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { PayoutStatus } from "@dub/prisma/client";
import { InfoTooltip } from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils";
import { ReactNode } from "react";

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
}: {
  label: string;
  amount: number;
  icon: any;
  iconClassName?: string;
  tooltip?: string;
  sublabel?: ReactNode;
  error?: boolean;
}) {
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
          <InfoTooltip content={tooltip} side="top" className="size-3.5" />
        )}
      </div>

      <div className="flex items-end gap-2">
        {!isLoading ? (
          <span className="text-base font-medium leading-6 text-neutral-800 sm:text-xl sm:leading-7">
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
        ) : (
          <div className="h-6 w-20 animate-pulse rounded bg-neutral-200 sm:h-7 sm:w-24" />
        )}

        {/* {sublabel && (
          <span className="ml-2 text-xs text-neutral-500">{sublabel}</span>
        )} */}
      </div>
    </div>
  );
}

export function PayoutStats() {
  const { partner } = usePartnerProfile();

  const { payoutsCount, error } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  let payoutMethod: "stripe" | "paypal" | undefined = undefined;

  if (partner?.stripeConnectId) {
    payoutMethod = "stripe";
  } else if (partner?.paypalEmail) {
    payoutMethod = "paypal";
  }

  const tooltip = payoutMethod ? tooltips[payoutMethod] : undefined;

  const payoutStatusMap = Object.fromEntries(
    payoutsCount?.map((p) => [p.status, p]) || [],
  ) as Record<PayoutStatus, PayoutsCount>;

  const payoutStats = [
    {
      label: "Pending",
      amount: payoutStatusMap?.pending?.amount,
      icon: PayoutStatusBadges.pending.icon,
      iconClassName: "bg-orange-100 text-orange-500",
      tooltip: tooltip?.pending,
      error: !!error,
      payoutMethod,
    },
    {
      label: "Processing",
      amount: payoutStatusMap?.processing?.amount,
      icon: PayoutStatusBadges.processing.icon,
      iconClassName: "bg-blue-100 text-blue-500",
      tooltip: tooltip?.processing,
      error: !!error,
      payoutMethod,
    },

    ...(payoutMethod === "stripe"
      ? [
          {
            label: "Sent",
            amount: payoutStatusMap?.sent?.amount,
            icon: PayoutStatusBadges.sent.icon,
            iconClassName: "bg-indigo-100 text-indigo-500",
            tooltip: tooltip?.sent,
            sublabel: "Est: 4 business days",
            error: !!error,
            payoutMethod,
          },
        ]
      : []),

    {
      label: "Complete",
      amount: payoutStatusMap?.completed?.amount,
      icon: PayoutStatusBadges.completed.icon,
      iconClassName: "bg-green-100 text-green-500",
      tooltip: tooltip?.completed,
      error: !!error,
      payoutMethod,
    },
  ];

  return (
    <div
      className={cn(
        "grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200",
        payoutMethod === "stripe"
          ? "xs:grid-cols-4 xs:divide-x xs:divide-y-0"
          : "xs:grid-cols-3 xs:divide-x xs:divide-y-0",
      )}
    >
      {payoutStats.map((stat) => (
        <PayoutStatsCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
