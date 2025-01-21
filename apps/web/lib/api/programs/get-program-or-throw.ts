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
    includeDiscounts = false,
  }: {
    includeDiscounts?: boolean;
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

  return ProgramSchema.parse(program);
};
