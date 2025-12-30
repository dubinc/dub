import { RewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export async function getRewardOrThrow({
  rewardId,
  programId,
}: {
  rewardId: string;
  programId: string;
}) {
  const reward = await prisma.reward.findUnique({
    where: {
      id: rewardId,
    },
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

  return RewardSchema.parse(reward);
}
