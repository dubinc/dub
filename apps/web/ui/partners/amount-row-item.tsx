import { MIN_PAYOUT_AMOUNT } from "@/lib/partners/constants";
import { Tooltip } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";

export function AmountRowItem({ amount }: { amount: number }) {
  const display = currencyFormatter(amount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (amount < MIN_PAYOUT_AMOUNT) {
    return (
      <Tooltip
        content={`Minimum payout amount is ${currencyFormatter(
          MIN_PAYOUT_AMOUNT / 100,
        )}. This payout will be processed in the next payout period.`}
      >
        <span className="cursor-default truncate text-neutral-400 underline decoration-dotted underline-offset-2">
          {display}
        </span>
      </Tooltip>
    );
  }

  return display;
}
