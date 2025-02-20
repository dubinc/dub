import { RewardProps } from "@/lib/types";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
import { RewardSchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";
import { getRewardOrThrow } from "../partners/get-reward-or-throw";

export const getProgramOrThrow = async (
  {
    workspaceId,
    programId,
  }: {
    workspaceId: string;
    programId: string;
  },
  {
    includeDiscounts = false,
    includeDefaultReward = false,
  }: {
    includeDiscounts?: boolean;
    includeDefaultReward?: boolean;
  } = {},
) => {
  const program = await prisma.program.findUnique({
    where: {
      id: programId,
      workspaceId,
    },
    ...(includeDiscounts
      ? {
          include: {
            discounts: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        }
      : {}),
  });

  if (!program) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found",
    });
  }

  let defaultReward: RewardProps | null = null;

  if (includeDefaultReward && program.defaultRewardId) {
    defaultReward = await getRewardOrThrow({
      rewardId: program.defaultRewardId,
      programId,
    });

    defaultReward = RewardSchema.parse(defaultReward);
  }

  return ProgramSchema.parse({
    ...program,
    ...(defaultReward ? { rewards: [defaultReward] } : {}),
  });
};
