import { sortRewardsByEventOrder } from "@/lib/partners/sort-rewards-by-event-order";
import { ProgramProps } from "@/lib/types";
import {
  ProgramSchema,
  ProgramWithLanderDataSchema,
} from "@/lib/zod/schemas/programs";
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
    includeDefaultRewards = false,
    includeLanderData = false,
  }: {
    includeDefaultRewards?: boolean;
    includeDefaultDiscount?: boolean;
    includeLanderData?: boolean;
  } = {},
) => {
  const program = (await prisma.program.findUnique({
    where: {
      id: programId,
      workspaceId,
    },
    include: {
      ...(includeDefaultRewards && {
        rewards: {
          where: {
            default: true,
          },
        },
      }),
      ...(includeDefaultDiscount && {
        discounts: {
          where: {
            default: true,
          },
        },
      }),
    },
  })) as ProgramProps | null;

  if (!program) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found",
    });
  }

  return (
    includeLanderData ? ProgramWithLanderDataSchema : ProgramSchema
  ).parse({
    ...program,
    ...(includeDefaultRewards && program.rewards?.length
      ? { rewards: sortRewardsByEventOrder(program.rewards) }
      : {}),
    ...(includeDefaultDiscount && program.discounts?.length
      ? { discounts: [program.discounts[0]] }
      : {}),
  });
};
