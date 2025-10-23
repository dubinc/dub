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

  if (reward.type === "percentage" && reward.amountInPercentage) {
    return sale.amount * (reward.amountInPercentage / 100);
  } else if (reward.type === "flat" && reward.amountInCents) {
    return sale.quantity * reward.amountInCents;
  }

  return 0;
};
