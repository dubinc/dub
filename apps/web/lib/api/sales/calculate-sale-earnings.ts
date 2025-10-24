import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { RewardProps } from "@/lib/types";
import { Commission } from "@dub/prisma/client";

/* 
  Calculate the commission earned for a sale
*/
export const calculateSaleEarnings = ({
  reward,
  sale,
}: {
  reward: Pick<RewardProps, "type" | "amountInCents" | "amountInPercentage">;
  sale: Pick<Commission, "quantity" | "amount">;
}) => {
  if (!reward) {
    return 0;
  }

  const amount = getRewardAmount(reward);

  if (reward.type === "flat") {
    return sale.quantity * amount;
  } else if (reward.type === "percentage") {
    return sale.amount * (amount / 100);
  }

  return 0;
};
