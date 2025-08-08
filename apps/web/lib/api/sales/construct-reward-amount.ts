import { RewardStructure } from "@dub/prisma/client";
import { currencyFormatter } from "@dub/utils";

export const constructRewardAmount = ({
  type,
  amount: amountProp,
  amounts,
}: {
  type: RewardStructure;
} & (
  | { amount: number; amounts?: never }
  | { amount?: never; amounts: number[] }
)) => {
  // Range of amounts
  if (amounts && amounts.length > 1) {
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    return type === "percentage"
      ? `${min}% - ${max}%`
      : `${formatCurrency(min)} - ${formatCurrency(max)}`;
  }

  // Single amount
  const amount = amountProp ?? amounts?.[0];
  return type === "percentage" ? `${amount}%` : formatCurrency(amount);
};

const formatCurrency = (amount: number) =>
  currencyFormatter(
    amount / 100,
    amount % 100 === 0
      ? undefined
      : {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
  );
