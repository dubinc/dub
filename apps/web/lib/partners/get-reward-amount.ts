import "client-only";
import { RewardProps } from "../types";

export const getRewardAmount = (
  reward: Pick<RewardProps, "type" | "amountInCents" | "amountInPercentage">,
) => {
  const { type, amountInCents, amountInPercentage } = reward;

  const amount = type === "flat" ? amountInCents : amountInPercentage;

  return amount === null || amount === undefined ? 0 : amount;
};
