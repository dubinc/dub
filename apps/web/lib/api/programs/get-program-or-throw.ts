import { ProgramSchemaWithInviteEmailData } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import * as z from "zod/v4";
import { DubApiError } from "../errors";

type ProgramWithInclude<T extends Prisma.ProgramInclude = {}> = z.infer<
  typeof ProgramSchemaWithInviteEmailData
> &
  Prisma.ProgramGetPayload<{ include: T }>;

export async function getProgramOrThrow<T extends Prisma.ProgramInclude = {}>({
  workspaceId,
  programId,
  include,
}: {
  workspaceId: string;
  programId: string;
  include?: T;
}): Promise<ProgramWithInclude<T>> {
  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    include,
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

  return transformedProgram as ProgramWithInclude<T>;
}
