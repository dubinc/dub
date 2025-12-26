"use client";

import { forceWithdrawalAction } from "@/lib/actions/partners/force-withdrawal";
import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "@/lib/constants/payouts";
import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PayoutsCount } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { PAYOUT_STATUS_DESCRIPTIONS } from "@/ui/partners/payout-status-descriptions";
import { AlertCircleFill } from "@/ui/shared/icons";
import { PayoutStatus } from "@dub/prisma/client";
import { Button, Tooltip } from "@dub/ui";
import {
  cn,
  CONNECT_SUPPORTED_COUNTRIES,
  currencyFormatter,
  PAYPAL_SUPPORTED_COUNTRIES,
} from "@dub/utils";
import { HelpCircle } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

function PayoutStatsCard({
  label,
  amount,
  icon: Icon,
  iconClassName,
  tooltip,
  error,
  setShowForceWithdrawalModal,
}: {
  label: string;
  amount: number;
  icon: any;
  iconClassName?: string;
  tooltip?: string;
  error?: boolean;
  setShowForceWithdrawalModal: (show: boolean) => void;
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
                  <>{amount > 0 ? currencyFormatter(amount) : "$0.00"}</>
                )}
              </span>
              {label === "Processed" && amount > 0 && (
                <Button
                  variant="secondary"
                  text="Pay out now"
                  className="ml-2 h-7 px-2 py-1"
                  onClick={() => setShowForceWithdrawalModal(true)}
                  disabledTooltip={
                    amount < MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS
                      ? `Your current processed payouts balance is less than the minimum amount required for withdrawal (${currencyFormatter(MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS)}).`
                      : undefined
                  }
                />
              )}
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

  const tooltip = payoutMethod
    ? PAYOUT_STATUS_DESCRIPTIONS[payoutMethod]
    : undefined;

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

  const { executeAsync: executeForceWithdrawal } = useAction(
    forceWithdrawalAction,
    {
      onSuccess: () => {
        toast.success("Withdrawal initiated successfully");
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to initiate withdrawal");
      },
    },
  );

  const processedPayoutAmountInUsd = currencyFormatter(
    payoutStatusMap?.processed?.amount,
    {
      trailingZeroDisplay: "stripIfInteger",
    },
  );

  const {
    confirmModal: forceWithdrawalModal,
    setShowConfirmModal: setShowForceWithdrawalModal,
  } = useConfirmModal({
    title: "Pay out funds instantly",
    description: (
      <>
        Since your total processed earnings (
        <strong className="text-black">{processedPayoutAmountInUsd}</strong>)
        are below the minimum requirement of{" "}
        <strong className="text-black">
          {currencyFormatter(MIN_WITHDRAWAL_AMOUNT_CENTS, {
            trailingZeroDisplay: "stripIfInteger",
          })}
        </strong>
        , you will be charged a fee of{" "}
        <strong className="text-black">
          {currencyFormatter(BELOW_MIN_WITHDRAWAL_FEE_CENTS)}
        </strong>{" "}
        for this payout, which means you will receive{" "}
        <strong className="text-black">
          {currencyFormatter(
            payoutStatusMap?.processed?.amount - BELOW_MIN_WITHDRAWAL_FEE_CENTS,
            { trailingZeroDisplay: "stripIfInteger" },
          )}
        </strong>
        .
      </>
    ),
    onConfirm: async () => {
      await executeForceWithdrawal();
    },
    confirmText: `Pay out ${processedPayoutAmountInUsd}`,
  });

  return (
    <>
      {forceWithdrawalModal}
      {/* Mobile: 3 on top, 2 on bottom */}
      <div className="grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white md:hidden">
        <div className="grid grid-cols-3 divide-x divide-neutral-200">
          {topRowStats.map((stat) => (
            <PayoutStatsCard
              key={stat.label}
              {...stat}
              setShowForceWithdrawalModal={setShowForceWithdrawalModal}
            />
          ))}
        </div>
        {bottomRowStats.length > 0 && (
          <div className="grid grid-cols-2 divide-x divide-neutral-200">
            {bottomRowStats.map((stat) => (
              <PayoutStatsCard
                key={stat.label}
                {...stat}
                setShowForceWithdrawalModal={setShowForceWithdrawalModal}
              />
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
          <PayoutStatsCard
            key={stat.label}
            {...stat}
            setShowForceWithdrawalModal={setShowForceWithdrawalModal}
          />
        ))}
      </div>
    </>
  );
}
