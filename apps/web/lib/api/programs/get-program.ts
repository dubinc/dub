import { prisma } from "@/lib/prisma";
import { ProgramSchema } from "@/lib/zod/schemas/partners";
import { DubApiError } from "../errors";

export const getProgramOrThrow = async ({
  workspaceId,
  programId,
}: {
  workspaceId: string;
  programId: string;
}) => {
  const program = await prisma.program.findUnique({
    where: {
      id: programId,
      workspaceId,
    },
  });

  if (!program) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found",
    });
  }

  return ProgramSchema.parse(program);
};
