import { Prisma, RewardStructure } from "@dub/prisma/client";
import "server-only";

interface GetRewardAmountProps {
  type: RewardStructure;
  amountInCents?: number | null;
  amountInPercentage?: Prisma.Decimal | number | null;
}

export const getRewardAmount = (reward: GetRewardAmountProps) => {
  let { type, amountInCents, amountInPercentage } = reward;

  if (amountInPercentage && amountInPercentage instanceof Prisma.Decimal) {
    amountInPercentage = amountInPercentage.toNumber();
  }

  const amount = type === "flat" ? amountInCents : amountInPercentage;

  return amount === null || amount === undefined ? 0 : amount;
};
