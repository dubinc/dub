import { DubApiError } from "@/lib/api/errors";
import { withPartner } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/programs/[programId] – get a partner's enrollment in a program
export const GET = withPartner(async ({ partner, params }) => {
  const idOrSlug = params.programId;

  let programId: string | undefined;
  let programSlug: string | undefined;

  idOrSlug.startsWith("prog_")
    ? (programId = idOrSlug)
    : (programSlug = idOrSlug);

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId || undefined,
      slug: programSlug || undefined,
    },
  });

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: partner.id,
        programId: program.id,
      },
    },
    include: {
      link: true,
    },
  });

  if (!programEnrollment) {
    throw new DubApiError({
      code: "not_found",
      message: "You're not enrolled in this program",
    });
  }

  return NextResponse.json(
    ProgramEnrollmentSchema.parse({
      ...programEnrollment,
      program,
    }),
  );
});
