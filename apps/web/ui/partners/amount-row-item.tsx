import { PayoutStatus } from "@dub/prisma/client";
import { Tooltip } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";

export function AmountRowItem({
  amount,
  status,
  payoutsEnabled,
  minPayoutAmount,
}: {
  amount: number;
  status: PayoutStatus;
  payoutsEnabled: boolean;
  minPayoutAmount: number;
}) {
  const display = currencyFormatter(amount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (status === PayoutStatus.pending) {
    if (amount < minPayoutAmount) {
      return (
        <Tooltip
          content={`Minimum payout amount is ${currencyFormatter(
            minPayoutAmount / 100,
          )}. This payout will be accrued and processed during the next payout period.`}
        >
          <span className="cursor-default truncate text-neutral-400 underline decoration-dotted underline-offset-2">
            {display}
          </span>
        </Tooltip>
      );
    } else if (!payoutsEnabled) {
      return (
        <Tooltip content="This partner does not have payouts enabled, which means they will not be able to receive any payouts from this program.">
          <span className="cursor-default truncate text-neutral-400 underline decoration-dotted underline-offset-2">
            {display}
          </span>
        </Tooltip>
      );
    }
  }

  return display;
}
