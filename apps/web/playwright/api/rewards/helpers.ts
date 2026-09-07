import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { Prisma, Reward } from "@prisma/client";

export async function createReward(
  data: Omit<Prisma.RewardUncheckedCreateInput, "id">,
): Promise<Reward> {
  return prisma.reward.create({
    data: {
      id: createId({ prefix: "rw_" }),
      ...data,
    },
  });
}

export async function updateReward(
  rewardId: string,
  data: Prisma.RewardUncheckedUpdateInput,
) {
  return prisma.reward.update({
    where: {
      id: rewardId,
    },
    data,
  });
}

export async function deleteReward(rewardId: string | undefined) {
  if (!rewardId) return;

  await prisma.reward.delete({
    where: {
      id: rewardId,
    },
  });
}
