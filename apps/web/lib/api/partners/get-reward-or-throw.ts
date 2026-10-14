import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { DubApiError } from "../errors";

export async function getRewardOrThrow<T extends Prisma.RewardInclude = {}>({
  rewardId,
  programId,
  include,
}: {
  rewardId: string;
  programId: string;
  include?: T;
}): Promise<Prisma.RewardGetPayload<{ include: T }>> {
  const reward = await prisma.reward.findUnique({
    where: {
      id: rewardId,
    },
    include,
  });

  if (!reward) {
    throw new DubApiError({
      code: "not_found",
      message: "Reward not found.",
    });
  }

  if (reward.programId !== programId) {
    throw new DubApiError({
      code: "not_found",
      message: "Reward does not belong to the program.",
    });
  }

  return reward as Prisma.RewardGetPayload<{ include: T }>;
}
