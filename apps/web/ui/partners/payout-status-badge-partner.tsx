import { Payout } from "@dub/prisma/client";
import { DynamicTooltipWrapper, StatusBadge } from "@dub/ui";
import { PayoutStatusBadges } from "./payout-status-badges";

export const PayoutStatusBadgePartner = ({
  payout,
}: {
  payout: Pick<Payout, "status" | "amount"> & {
    failureReason?: string | null;
  };
}) => {
  const badge = PayoutStatusBadges[payout.status];

  const tooltip = (() => {
    if (payout.status === "failed" && payout.failureReason) {
      return payout.failureReason;
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
