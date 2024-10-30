import { prisma } from "@/lib/prisma";
import { ProgramSchema } from "@/lib/zod/schemas/partners";

export const getProgramOrThrow = async ({
  workspaceId,
  programId,
}: {
  workspaceId: string;
  programId: string;
}) => {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
      workspaceId,
    },
  });

  return ProgramSchema.parse(program);
};
