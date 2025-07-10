"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import { PayoutsCount } from "@/lib/types";
import { PayoutStatus } from "@dub/prisma/client";
import {
  InfoTooltip,
  LoadingCircle,
  PaperPlane,
  Success,
  TriangleWarning,
} from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils";
import { ReactNode } from "react";

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
  tooltip: string;
  sublabel?: ReactNode;
  error?: boolean;
}) {
  const isLoading = amount === undefined || error;

  console.log({
    label,
    isLoading,
    amount,
    error,
  });

  return (
    <div className="flex min-w-[200px] flex-col gap-3 p-4">
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
        <InfoTooltip content={tooltip} side="top" className="size-3.5" />
      </div>

      <div className="flex items-end gap-2">
        {!isLoading ? (
          <span className="text-xl font-medium leading-7 text-neutral-800">
            {error ? (
              "-"
            ) : (
              <>
                USD{" "}
                {amount > 0
                  ? currencyFormatter(amount / 100, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"}
              </>
            )}
          </span>
        ) : (
          <div className="h-7 w-24 animate-pulse rounded bg-neutral-200" />
        )}

        {/* {sublabel && (
          <span className="ml-2 text-xs text-neutral-500">{sublabel}</span>
        )} */}
      </div>
    </div>
  );
}

export function PayoutStats() {
  const { payoutsCount, error } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const payoutStatusMap = Object.fromEntries(
    payoutsCount?.map((p) => [p.status, p]) || [],
  ) as Record<PayoutStatus, PayoutsCount>;

  const payoutStats = [
    {
      label: "Pending",
      amount: payoutStatusMap?.pending?.amount,
      icon: TriangleWarning,
      iconClassName: "bg-orange-100 text-orange-500",
      tooltip:
        "Payouts that have passed the program’s holding period and are waiting to be processed.",
      error: !!error,
    },
    {
      label: "Processing",
      amount: payoutStatusMap?.processing?.amount,
      icon: LoadingCircle,
      iconClassName: "bg-blue-100 text-blue-500",
      tooltip:
        "Payouts that have been processed by the program and are on their way to your Stripe Express account.",
      error: !!error,
    },
    {
      label: "Sent",
      amount: payoutStatusMap?.sent?.amount,
      icon: PaperPlane,
      iconClassName: "bg-indigo-100 text-indigo-500",
      tooltip:
        "Payouts that have been sent to your Stripe Express account and will be automatically paid out once they reach your minimum withdrawal balance.",
      sublabel: "Est: 4 business days",
      error: !!error,
    },
    {
      label: "Complete",
      amount: payoutStatusMap?.completed?.amount,
      icon: Success,
      iconClassName: "bg-green-100 text-green-500",
      tooltip:
        "Payouts that have been paid out from Stripe to your connected bank account.",
      error: !!error,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 divide-y-0 rounded-lg border border-neutral-200 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
      {payoutStats.map((stat) => (
        <PayoutStatsCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
