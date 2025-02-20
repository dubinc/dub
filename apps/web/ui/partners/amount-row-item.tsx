import { MIN_PAYOUT_AMOUNT } from "@/lib/partners/constants";
import { PayoutStatus } from "@dub/prisma/client";
import { Tooltip } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";

export function AmountRowItem({
  amount,
  status,
  payoutsEnabled,
}: {
  amount: number;
  status: PayoutStatus;
  payoutsEnabled: boolean;
}) {
  const display = currencyFormatter(amount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (status === PayoutStatus.pending) {
    if (!payoutsEnabled) {
      return (
        <Tooltip content="This partner does not have payouts enabled, which means they will not be able to receive any payouts from this program.">
          <span className="cursor-default truncate text-neutral-400 underline decoration-dotted underline-offset-2">
            {display}
          </span>
        </Tooltip>
      );
    } else if (amount < MIN_PAYOUT_AMOUNT) {
      return (
        <Tooltip
          content={`Minimum payout amount is ${currencyFormatter(
            MIN_PAYOUT_AMOUNT / 100,
          )}. This payout will be accrued and processed during the next payout period.`}
        >
          <span className="cursor-default truncate text-neutral-400 underline decoration-dotted underline-offset-2">
            {display}
          </span>
        </Tooltip>
      );
    }
  }

  return display;
}
