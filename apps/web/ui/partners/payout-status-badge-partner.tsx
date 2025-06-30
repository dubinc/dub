import { Payout, Program } from "@dub/prisma/client";
import { DynamicTooltipWrapper, StatusBadge } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import { PayoutStatusBadges } from "./payout-status-badges";

export const PayoutStatusBadgePartner = ({
  payout,
  program,
}: {
  payout: Pick<Payout, "status" | "amount"> & {
    failureReason?: string | null;
  };
  program: Pick<Program, "minPayoutAmount">;
}) => {
  const badge = PayoutStatusBadges[payout.status];
  const tooltip = (() => {
    if (payout.status === "failed" && payout.failureReason) {
      return payout.failureReason;
    }
    if (payout.status === "pending") {
      return payout.amount >= program.minPayoutAmount
        ? "This payout will be processed depends on your program's payment schedule, which is usually at the beginning or the end of the month."
        : `This program's minimum payout amount is ${currencyFormatter(
            program.minPayoutAmount / 100,
          )}. This payout will be accrued and processed during the next payout period.`;
    }
    return undefined;
  })();

  return badge ? (
    <StatusBadge icon={badge.icon} variant={badge.variant}>
      <DynamicTooltipWrapper
        tooltipProps={tooltip ? { content: tooltip } : undefined}
      >
        {badge.label}
      </DynamicTooltipWrapper>
    </StatusBadge>
  ) : (
    "-"
  );
};
