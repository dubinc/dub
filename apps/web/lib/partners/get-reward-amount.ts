import { RewardProps } from "../types";

export const getRewardAmount = (
  reward: Pick<RewardProps, "type" | "amountInCents" | "amountInPercentage">,
) => {
  const amount =
    reward.type === "flat" ? reward.amountInCents : reward.amountInPercentage;

  return amount === null || amount === undefined ? 0 : amount;
};
