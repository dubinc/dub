"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PayoutsCount } from "@/lib/types";
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

const tooltips = {
  stripe: {
    pending:
      "Payouts that have passed the program's holding period and are waiting to be processed.",
    processing:
      " Payouts that are being processed by the program – this can take up to 5 business days.",
    processed:
      "Payouts that have been processed by the program and will be paid out to your connected bank account once they reach your minimum withdrawal balance.",
    sent: "Payouts that are on their way to your connected bank account – this can take anywhere from 1 to 14 business days depending on your bank location.",
    completed:
      "Payouts that have been paid out to your connected bank account.",
  },

  paypal: {
    pending:
      "Payouts that have passed the program's holding period and are waiting to be processed.",
    processing:
      "Payouts that have been processed by the program and are on their way to your PayPal account - this can take up to 5 business days.",
    processed: "",
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
  error,
}: {
  label: string;
  amount: number;
  icon: any;
  iconClassName?: string;
  tooltip?: string;
  error?: boolean;
}) {
  const { partner } = usePartnerProfile();

  const isLoading = amount === undefined || error;

  return (
    <div className="flex flex-col gap-2 p-3 sm:gap-3 sm:p-4">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "hidden size-6 items-center justify-center rounded-md sm:flex",
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

              <span className="h-5 text-base font-medium leading-6 text-neutral-800 sm:h-7 sm:text-xl sm:leading-7">
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
            </div>
          ) : (
            <div className="h-5 w-20 animate-pulse rounded bg-neutral-200 sm:h-7 sm:w-24" />
          )}
        </div>
      </div>
    </div>
  );
}

export function PayoutStats() {
  const { partner } = usePartnerProfile();

  const { payoutsCount, error } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

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
      iconClassName: PayoutStatusBadges.pending.className,
      tooltip: tooltip?.pending,
      error: !!error,
    },

    {
      label: "Processing",
      amount: payoutStatusMap?.processing?.amount,
      icon: PayoutStatusBadges.processing.icon,
      iconClassName: PayoutStatusBadges.processing.className,
      tooltip: tooltip?.processing,
      error: !!error,
    },

    ...(payoutMethod === "stripe"
      ? [
          {
            label: "Processed",
            amount: payoutStatusMap?.processed?.amount,
            icon: PayoutStatusBadges.processed.icon,
            iconClassName: PayoutStatusBadges.processed.className,
            tooltip: tooltip?.processed,
            error: !!error,
          },

          {
            label: "Sent",
            amount: payoutStatusMap?.sent?.amount,
            icon: PayoutStatusBadges.sent.icon,
            iconClassName: PayoutStatusBadges.sent.className,
            tooltip: tooltip?.sent,
            error: !!error,
          },
        ]
      : []),

    {
      label: "Completed",
      amount: payoutStatusMap?.completed?.amount,
      icon: PayoutStatusBadges.completed.icon,
      iconClassName: PayoutStatusBadges.completed.className,
      tooltip: tooltip?.completed,
      error: !!error,
    },
  ];

  // Split payoutStats for mobile layout
  const topRowStats = payoutStats.slice(0, 3);
  const bottomRowStats = payoutStats.slice(3);

  return (
    <>
      {/* Mobile: 3 on top, 2 on bottom */}
      <div className="grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white md:hidden">
        <div className="grid grid-cols-3 divide-x divide-neutral-200">
          {topRowStats.map((stat) => (
            <PayoutStatsCard key={stat.label} {...stat} />
          ))}
        </div>
        {bottomRowStats.length > 0 && (
          <div className="grid grid-cols-2 divide-x divide-neutral-200">
            {bottomRowStats.map((stat) => (
              <PayoutStatsCard key={stat.label} {...stat} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: all in one row */}
      <div
        className={cn(
          "hidden divide-x divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white md:grid",
          payoutMethod === "stripe" ? "md:grid-cols-5" : "md:grid-cols-3",
        )}
      >
        {payoutStats.map((stat) => (
          <PayoutStatsCard key={stat.label} {...stat} />
        ))}
      </div>
    </>
  );
}
