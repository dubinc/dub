import { RewardProps } from "@/lib/types";
import { Commission } from "@dub/prisma/client";

/* 
  Calculate the commission earned for a sale
*/
export const calculateSaleEarnings = ({
  reward,
  sale,
}: {
  reward: Pick<RewardProps, "amount" | "type">;
  sale: Pick<Commission, "quantity" | "amount">;
}) => {
  if (!reward) {
    return 0;
  }

  if (reward.type === "percentage") {
    return sale.amount * (reward.amount / 100);
  }

  if (reward.type === "flat") {
    return sale.quantity * reward.amount;
  }

  throw new Error("Invalid reward type");
};
