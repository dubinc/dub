import { reorderTopProgramRewards } from "@/lib/partners/reorder-top-program-rewards";
import { DiscountProps, ProgramProps } from "@/lib/types";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

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
    includeRewards = false,
  }: {
    includeDefaultDiscount?: boolean;
    includeDefaultReward?: boolean;
    includeRewards?: boolean;
  } = {},
) => {
  const program = (await prisma.program.findUnique({
    where: {
      id: programId,
      workspaceId,
    },

    include: {
      ...(includeDefaultDiscount && {
        defaultDiscount: true,
      }),
      ...(includeDefaultReward && {
        defaultReward: true,
      }),
      ...(includeRewards && {
        rewards: {
          where: {
            partners: {
              none: {}, // program-wide rewards only
            },
          },
        },
      }),
    },
  })) as (ProgramProps & { defaultDiscount: DiscountProps | null }) | null;

  if (!program) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found",
    });
  }

  return ProgramSchema.parse({
    ...program,
    ...(includeRewards && program.rewards?.length
      ? { rewards: reorderTopProgramRewards(program.rewards as any) }
      : {}),
    ...(includeDefaultDiscount && program.defaultDiscount
      ? { discounts: [program.defaultDiscount] }
      : {}),
  });
};
