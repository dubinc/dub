import { programInviteEmailDataSchema } from "@/lib/zod/schemas/program-invite-email";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { z } from "zod";
import { DubApiError } from "../errors";

// Extended schema with inviteEmailData
const ProgramWithInviteEmailSchema = ProgramSchema.extend({
  inviteEmailData: programInviteEmailDataSchema,
});

// Type that combines Zod schema inference with Prisma include payload
type ProgramWithInclude<T extends Prisma.ProgramInclude = {}> = z.infer<
  typeof ProgramWithInviteEmailSchema
> &
  Prisma.ProgramGetPayload<{ include: T }>;

// Type-safe version that accepts an include object directly
export async function getProgramOrThrow<T extends Prisma.ProgramInclude = {}>({
  workspaceId,
  programId,
  include,
}: {
  workspaceId: string;
  programId: string;
  include?: T;
}): Promise<ProgramWithInclude<T>> {
  const finalInclude = include
    ? ({
        ...include,
        categories: include.categories ? true : false,
      } as T)
    : undefined;

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    ...(finalInclude && { include: finalInclude }),
  });

  if (!program || program.workspaceId !== workspaceId) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found.",
    });
  }

  // Transform categories if included
  const transformedProgram =
    include?.categories && "categories" in program
      ? {
          ...program,
          // @ts-ignore conditionally transforming categories
          categories: program.categories?.map(({ category }) => category) ?? [],
        }
      : program;

  return ProgramWithInviteEmailSchema.parse(
    transformedProgram,
  ) as ProgramWithInclude<T>;
}
