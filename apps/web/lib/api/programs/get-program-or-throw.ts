import { sortRewardsByEventOrder } from "@/lib/partners/sort-rewards-by-event-order";
import { DiscountProps, ProgramProps } from "@/lib/types";
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
    includeDefaultDiscount?: boolean;
    includeDefaultRewards?: boolean;
    includeLanderData?: boolean;
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
      ...(includeDefaultRewards && {
        rewards: {
          where: {
            default: true,
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

  return (
    includeLanderData ? ProgramWithLanderDataSchema : ProgramSchema
  ).parse({
    ...program,
    ...(includeDefaultRewards && program.rewards?.length
      ? { rewards: sortRewardsByEventOrder(program.rewards as any) }
      : {}),
    ...(includeDefaultDiscount && program.defaultDiscount
      ? { discounts: [program.defaultDiscount] }
      : {}),
  });
};
