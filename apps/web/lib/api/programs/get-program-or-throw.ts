import { programInviteEmailDataSchema } from "@/lib/zod/schemas/program-invite-email";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const getProgramOrThrow = async ({
  workspaceId,
  programId,
  includeCategories = false,
}: {
  workspaceId: string;
  programId: string;
  includeCategories?: boolean;
}) => {
  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
  });

  if (!program || program.workspaceId !== workspaceId) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found.",
    });
  }

  return ProgramSchema.extend({
    inviteEmailData: programInviteEmailDataSchema,
  }).parse(
    includeCategories
      ? {
          ...program,
          // @ts-ignore conditionally including categories
          categories: program.categories?.map(({ category }) => category) ?? [],
        }
      : program,
  );
};
