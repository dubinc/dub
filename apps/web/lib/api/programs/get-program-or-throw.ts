import { ProgramProps } from "@/lib/types";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const getProgramOrThrow = async ({
  workspaceId,
  programId,
}: {
  workspaceId: string;
  programId: string;
}) => {
  const program = (await prisma.program.findUnique({
    where: {
      id: programId,
      workspaceId,
    },
  })) as ProgramProps | null;

  if (!program) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found",
    });
  }

  return ProgramSchema.parse(program);
};
