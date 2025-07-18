import { RewardStructure } from "@dub/prisma/client";
import { currencyFormatter } from "@dub/utils";

export const constructRewardAmount = ({
  amount,
  type,
}: {
  amount: number;
  type: RewardStructure;
}) => {
  return type === "percentage"
    ? `${amount}%`
    : currencyFormatter(
        amount / 100,
        amount % 100 === 0
          ? undefined
          : {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
      );
};
