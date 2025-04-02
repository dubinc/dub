import { RewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { Reward } from "@prisma/client";
import { DubApiError } from "../errors";

export async function getRewardOrThrow(
  {
    rewardId,
    programId,
  }: {
    rewardId: string;
    programId: string;
  },
  {
    includePartnersCount = false,
  }: {
    includePartnersCount?: boolean;
  } = {},
) {
  const reward = (await prisma.reward.findUnique({
    where: {
      id: rewardId,
    },
    ...(includePartnersCount && {
      include: {
        _count: {
          select: { partners: true },
        },
      },
    }),
  })) as Reward & { _count?: { partners: number } };

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

  return RewardSchema.parse({
    ...reward,
    ...(includePartnersCount && {
      partnersCount: reward._count?.partners,
    }),
  });
}
