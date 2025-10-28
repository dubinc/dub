import { RewardProps } from "../types";

export const getRewardAmount = ({
  type,
  amountInCents,
  amountInPercentage,
}: Pick<RewardProps, "type" | "amountInCents" | "amountInPercentage">) => {
  const amount = type === "flat" ? amountInCents : amountInPercentage;

  return amount === null || amount === undefined ? 0 : amount;
};
