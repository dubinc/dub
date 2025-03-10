import { DiscountProps, ProgramProps, RewardProps } from "@/lib/types";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
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
    includeDefaultDiscount = false,
    includeDefaultReward = false,
  }: {
    includeDefaultDiscount?: boolean;
    includeDefaultReward?: boolean;
  } = {},
) => {
  const program = (await prisma.program.findUnique({
    where: {
      id: programId,
      workspaceId,
    },

    ...(includeDefaultDiscount
      ? {
          include: {
            defaultDiscount: true,
          },
        }
      : {}),
  })) as (ProgramProps & { defaultDiscount: DiscountProps | null }) | null;

  // TODO:
  // Add a new relation (defaultReward) to fetch the default reward

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
  }

  return ProgramSchema.parse({
    ...program,
    ...(includeDefaultReward && defaultReward
      ? { rewards: [defaultReward] }
      : {}),
    ...(includeDefaultDiscount && program.defaultDiscount
      ? { discounts: [program.defaultDiscount] }
      : {}),
  });
};
