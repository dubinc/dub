import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Payout, Program } from "@dub/prisma/client";
import { StatusBadge, Tooltip } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import { useMemo } from "react";
import { PayoutStatusBadges } from "./payout-status-badges";
import { PAYOUT_STATUS_DESCRIPTIONS } from "./payout-status-descriptions";

export const PayoutStatusBadgePartner = ({
  payout,
  program,
}: {
  payout: Pick<Payout, "status" | "amount"> & {
    failureReason?: string | null;
  };
  program: Pick<Program, "minPayoutAmount">;
}) => {
  const { partner } = usePartnerProfile();

  const badge = PayoutStatusBadges[payout.status];

  const tooltipContent: string | undefined = useMemo(() => {
    if (!partner) {
      return undefined;
    }
    if (payout.status === "failed" && payout.failureReason) {
      return payout.failureReason;
    }
    if (
      payout.status === "pending" &&
      payout.amount < program.minPayoutAmount
    ) {
      return `This program's minimum payout amount is ${currencyFormatter(
        program.minPayoutAmount,
        { trailingZeroDisplay: "stripIfInteger" },
      )}. This payout will be accrued and processed during the next payout period.`;
    }
    return (
      PAYOUT_STATUS_DESCRIPTIONS?.[
        partner?.paypalEmail ? "paypal" : "stripe"
      ]?.[payout.status] || PAYOUT_STATUS_DESCRIPTIONS?.paypal?.[payout.status]
    );
  }, [payout, program, partner]);

  return badge ? (
    <StatusBadge
      icon={badge.icon}
      variant={badge.variant}
      className={badge.className}
    >
      <Tooltip content={tooltipContent}>
        <div>{badge.label}</div>
      </Tooltip>
    </StatusBadge>
  ) : (
    "-"
  );
};
