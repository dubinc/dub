import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { DubApiError } from "../errors";

// Type-safe version that accepts an include object directly
export async function getProgramEnrollmentOrThrow<
  T extends Prisma.ProgramEnrollmentInclude,
>({
  partnerId,
  programId,
  include,
}: {
  partnerId: string;
  programId: string;
  include: T;
}): Promise<Prisma.ProgramEnrollmentGetPayload<{ include: T }>> {
  const finalInclude = {
    ...include,
    links: include.links
      ? {
          orderBy: {
            createdAt: "asc",
          },
        }
      : false,
  };

  const programEnrollment = programId.startsWith("prog_")
    ? await prisma.programEnrollment.findUnique({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        include: finalInclude,
      })
    : await prisma.programEnrollment.findFirst({
        where: {
          partnerId,
          program: {
            slug: programId,
          },
        },
        include: finalInclude,
      });

  if (!programEnrollment) {
    throw new DubApiError({
      code: "not_found",
      message: `Partner ${partnerId} is not enrolled in program ${programId}.`,
    });
  }

  return programEnrollment as Prisma.ProgramEnrollmentGetPayload<{
    include: T;
  }>;
}
