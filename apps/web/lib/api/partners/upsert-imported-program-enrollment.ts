import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Re-imports must not reopen a banned enrollment. A banned row is read back
// and left unchanged, including `updatedAt`.
export async function upsertImportedProgramEnrollment<
  T extends Prisma.ProgramEnrollmentInclude = {},
>({
  partnerId,
  programId,
  create,
  include,
}: {
  partnerId: string;
  programId: string;
  create: Prisma.ProgramEnrollmentUncheckedCreateInput;
  include?: T;
}): Promise<{
  enrollment: Prisma.ProgramEnrollmentGetPayload<{ include: T }>;
  preservedBan: boolean;
}> {
  const where = {
    partnerId_programId: {
      partnerId,
      programId,
    },
  };

  const existing = await prisma.programEnrollment.findUnique({
    where,
    select: {
      status: true,
    },
  });

  if (existing?.status === "banned") {
    const enrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where,
      include,
    });

    return {
      enrollment: enrollment as Prisma.ProgramEnrollmentGetPayload<{
        include: T;
      }>,
      preservedBan: true,
    };
  }

  const enrollment = await prisma.programEnrollment.upsert({
    where: {
      ...where,
      // to account for race conditions
      status: {
        not: "banned",
      },
    },
    create,
    update: {
      status: "approved",
    },
    include,
  });

  return {
    enrollment: enrollment as Prisma.ProgramEnrollmentGetPayload<{
      include: T;
    }>,
    preservedBan: false,
  };
}
